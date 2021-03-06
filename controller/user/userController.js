/*
 Author: Molefe Keletso
 Description: Reql functions
 */

'use strict';

var passwordHasher = require('password-hash-and-salt');
var jwt = require('jsonwebtoken');
var Q = require('q');
var generatePassword = require("password-generator");

/*Thinky ORM and Rethink variables*/
var thinky = require("../../Javascript/users");
var r = thinky.r;
var Errors = thinky.Errors;

var User = require("../../models/user/users");

exports.logout = function(req, res){
  delete req.session.token;
  delete req.session.success;

  res.json({"message": "logged out"});
}

exports.token = function(req, res){
  res.send(req.session.token);
}

exports.forgotpassword = function(req, res){
  var email = req.body.email;
  var transporter = exports.transporter;
  var maxLength = 10;
  var minLength = 8;
  var randomLength = Math.floor(Math.random() * (maxLength - minLength)) + minLength;
  var password = generatePassword(randomLength, false, /[\w\d\?\-]/);

  passwordHasher(password).hash(function(error, hash) {
    if (error)
      throw new Error('Something went wrong!');

    User
      .filter({"email": email}).nth(0).default(null)
      .update({"password": hash}).run()
      .then(function(user){
        var mailOptions = {
          from: '"Geospatial Data Visualiser And Processor ?" <donotreplycoeus@gmail.com>',
          to: email,
          subject: 'Reset password',
          text: 'your new password is: '+password
        };

        transporter.sendMail(mailOptions, function(error, info){
          if(error){
            return console.log(error);
          }
          console.log('Message sent: ' + info.response);
        });

        res.status(201).json({"message": "password reset"});
      })
      .catch(Errors.DocumentNotFound, function (err){
        res.status(404).json({"message": "user does not exist"});
      });
  });
}

exports.changeuser = function(req, res){
  var email = req.user.email;
  var oldpassword = req.body.oldpassword;
  var newpassword = req.body.password;

  User
    .filter({"email": email}).nth(0).default(null).run()
    .then(function(user){
      passwordHasher(oldpassword).verifyAgainst(user.password, function(error, verified) {
        if(error)
          throw new Error('Something went wrong!');
        if(!verified) {
          res.status(401).json({"message": "wrong"});
        } else {
          passwordHasher(newpassword).hash(function(error, hash) {
            User
              .filter({"email": email})
              .update({"password": hash}).run()
              .then(function (user) {
                res.status(201).json({"message": "password changed"});
              });
          });
        }
      });
    })
    .catch(Errors.DocumentNotFound, function (err){
      res.status(404).json({"message": "user does not exist"});
    });
}

exports.login = function(req, res){
  var email = req.body.email;
  var password = req.body.password;

  User
    .filter({"email": email}).nth(0).default(null).run()
    .then(function(user){
      passwordHasher(password).verifyAgainst(user.password, function(error, verified) {
        if(error)
          throw new Error('Something went wrong!');
        if(!verified) {
          res.status(401).json({"message": "wrong"});
        } else {
          Q
            .fcall(function(){
              return jwt.sign({ email: user.email, first_name: user.first_name, last_name: user.last_name }, "We love COS301");
            })
            .then(function(token){
              req.session.token = token;
              return token;
            })
            .then(function(token){
              res.status(202).json({"message": token});
            }).done();
        }
      });
    })
    .catch(Errors.DocumentNotFound, function (err){
      res.status(404).json({"message": "user does not exist"});
    });
}

exports.register = function(req, res){
  var email = req.body.email;
  var first_name = req.body.first_name;
  var last_name = req.body.last_name;
  var transporter = exports.transporter;
  var maxLength = 10;
  var minLength = 8;
  var randomLength = Math.floor(Math.random() * (maxLength - minLength)) + minLength;
  var password = generatePassword(randomLength, false, /[\w\d\?\-]/);

  passwordHasher(password).hash(function(error, hash) {
    if (error)
      throw new Error('Something went wrong!');

    User
      .filter({"email": email}).nth(0).default(null).run()
      .then(function(user){
        res.status(409).json({"message": "user exist"});
      })
      .catch(Errors.DocumentNotFound, function (err){
        var userObject = {
          "email": email,
          "first_name": first_name,
          "last_name": last_name,
          "password": hash,
          "favourates": [],
          "earthquakes": {location: -1, date: 2, magnitude: 3}
        };

        User.save([userObject]).then(function(result) {
          var mailOptions = {
            from: '"Geospatial Data Visualiser And Processor ?" <donotreplycoeus@gmail.com>',
            to: email,
            subject: 'Registration',
            text: 'Thank you for registering, you password is: '+password
          };

          transporter.sendMail(mailOptions, function(error, info){
            if(error){
              return console.log(error);
            }
            console.log('Message sent: ' + info.response);
          });

          res.status(201).json({"message": "user created"});
        }).error(function(error) {
          res.json({message: error});
        });
      });
  });
}

exports.favourate = function(req, res) {
  var favourate = req.body.favourate;
  var email = req.user.email;

  Q
    .fcall(function(){
      return r.db("users").table("Users").get(email).getField("favourates").filter(function (value) {
        return value.eq(favourate);
      });
    })
    .then(function(value){
      if(value.length){
        return [
          r.db("users").table("Users").get(email).update({
            favourates: r.row('favourates').filter(function(item){
              return item.ne(favourate);
            })
          }),
          "removed"
        ];
      }else{
        return [
          r.db("users").table("Users").get(email).update({
            favourates: r.row('favourates').append(favourate)
          }),
          "added"
        ];
      }
    })
    .spread(function(value,action){
      res.json({message: action});
    })
    .done();
}

exports.getfavourate = function(req, res){
  var email = req.user.email;

  Q
    .fcall(function(){
      return r.db("users").table("Users").get(email).getField("favourates");
    })
    .then(function(value){
      res.json({message: value});
    })
    .done();
}

exports.earthquakefilter = function(req, res){
  var filter = JSON.parse(req.body.filter);
  var email = req.user.email;

  Q
    .fcall(function(){
      return r.db("users").table("Users").get(email).update({
        earthquakes: filter
      });
    })
    .then(function(){
      res.send("saved");
    })
    .done();
}

exports.getearthquakefilter = function(req, res){
  var email = req.user.email;

  Q
    .fcall(function(){
      return r.db("users").table("Users").get(email).getField("earthquakes");
    })
    .then(function(value){
      res.json({message: value});
    })
    .done();
}
