import express from 'express';
import {engine} from 'express-handlebars';
import mongoose from "mongoose";
import morgan from "morgan";
import bodyParser from "body-parser";
import methodOverride from 'method-override';
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import session from 'express-session';
import flash from "connect-flash";
const app=express();

mongoose
.connect("mongodb://localhost:27017/blogSite")
.then(()=>console.log("Mongodb connected..."))
.catch((err)=>console.log(err));

import {User} from "./models/Blog.js";
import {Blog} from "./models/Blog.js";
import {Subscriber} from "./models/Blog.js"

//public static files
app.use(express.static('public'));

//handlebars middleware
app.engine("handlebars",engine());
app.set("view engine","handlebars");
app.set("views","./views");
app.use(morgan("tiny"));

//body-parser middleware
app.use(bodyParser.urlencoded({extended:false}));
//parse application/json
app.use(bodyParser.json());
//method override
app.use(methodOverride("_method"));

//set up passport local strategy
app.use(passport.initialize()); 
app.use(
    session({
        secret:"secret",
        reserve:true,
        saveUninitialized:true,
    })
);
app.use(passport.session());
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//login flash msg
app.use(flash());
app.use(function(req, res, next){
    res.locals.success_msg=req.flash('success_msg');
    res.locals.error_msg=req.flash('error_msg');
    next();
});

//login authenticate middleware
app.use(function (req, res, next) {
    res.locals.isAuthenticated = req.isAuthenticated();
    next();
});
function ensureAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next();
    } else {
        let errors=[];
        if(!req.isAuthenticated()){
            errors.push({text:"You are not logged in."});
            res.render("index",{errors:errors});
        }
    }
};

//basic routing
app.get("/",(req,res)=>{
    res.render("index");
});

//user routing and sign up
app.get("/users/createUser",(req,res)=>{
    res.render("users/createUser");
});
app.post("/users/createUser",(req,res)=>{
    let errors=[];
    if (!req.body.username){
        errors.push({text: "Please add a username"});
    }
    if (!req.body.password){
        errors.push({text: "Please add a password"});
    }
    if (req.body.password!=req.body.confirmPassword){
        errors.push({text:"Password and confirm password field do not match"})
    }
    if (errors.length>0){
        res.render("users/createUser",{
            errors:errors,
            username:req.body.username,
            password:req.body.password,
            confirmPassword:req.body.confirmPassword,
        });
    }else{
        const newUser=new User({
            username:req.body.username,
        });
        User.register(newUser,req.body.password,(err,user)=>{
            if(err){
                errors.push({text:err})
                res.render("users/createUser",{errors:errors});
            }else{
                req.login(user,(err)=>{
                    if (err){
                        errors.push({text:err})
                        res.render("users/createUser",{errors:errors});
                    }else{
                        // line 119 added by Clement on 16/6/2022
                        res.locals.isAuthenticated = req.isAuthenticated();
                        let success_msg="Successfully signed up and logged in";
                        res.render("myBlogs/index",{success_msg:success_msg})
                    }
                })}
            })
        };
    }
);

//login
app.get("/users/login",(req,res)=>{
    res.render("users/login");
});
app.post("/users/login",passport.authenticate("local",{
    failureRedirect:"login",
    failureFlash:true,
    failureFlash: {
        type:'error_msg',
        message:'Invalid username and/or password.'
    },
    successReturnToOrRedirect:"/myBlogs",
}));

//logout
app.get('/users/logout',(req,res)=>{
    req.logout((err)=>{
        if(err) {return next(err);}});
    res.redirect('/');
});

//blogs routing
app.get("/blogs",(req,res)=>{
    Blog.find({}).lean().populate({path:"author",model:User})
    .exec((err,blogs)=>{
        const allBlogs=blogs;
        User.find({}).lean().populate({path:"blogs",model:Blog})
        .exec((err,users)=>{
            res.render("blogs",{blogs:allBlogs,users:users});
        })
    });
});

// added by Clement
app.post("/blogs", async (req, res) => {
    /*
    let errors=[];
    if (!req.body.subscriberName || !req.body.subscriberEmail){
        errors.push({text: "Please input subscriber name/email"});
    }
    
    if (errors.length > 0){
        res.render("blogs",{
            errors:errors,
            blogs:blogs

        });
    }else{ 
    */
        const newSubscriber = new Subscriber({
            subscriberName: req.body.subscriberName,
            subscriberEmail: req.body.subscriberEmail,
            followAuthor: req.body.followAuthor,
        });
        await newSubscriber.save((err, subscriber) => {
            if (err) throw err;
            // Subscriber.findByIdAndUpdate(subscriber.subscriberName,{subscribers:subscriber.id});
        });
        // let success_msg = "Successfully recorded subscriber information";
        res.redirect("/blogs");
        }
    /* } */ 
);

//myBlog routing and entry
app.get("/myBlogs",ensureAuthenticated,(req,res)=>{
    Blog.find({author:req.user}).lean().sort({date:"desc"})
    .then((blogs)=>{
        res.render("myBlogs/index",{blogs:blogs,}); 
    });
});

app.get("/myBlogs/add",ensureAuthenticated,(req,res)=>{
    res.render("myBlogs/add");
});
app.get("/myBlogs/edit/:id",ensureAuthenticated,(req,res)=>{
    Blog.findOne({_id:req.params.id,}).lean().then((blog)=>{
        res.render("myBlogs/edit",{blog:blog,})
    })
});

app.post("/myBlogs",ensureAuthenticated,(req,res)=>{
    let errors=[];
    if (!req.body.title){
        errors.push({text: "please add a title"});
    }
    if (!req.body.details){
        errors.push({text: "please add some contents"});
    }
    if (errors.length>0){
        res.render("myBlogs/add",{
            errors:errors,
            title:req.body.title,
            details:req.body.details,
        });
    }else{
        const newBlog=new Blog({
            title:req.body.title,
            details:req.body.details,
            author:req.user.id,
        });
        const toUpdateUser=req.user;
        newBlog.save((err,blog)=>{
            if (err) {throw err}
            else{
                toUpdateUser.blogs.push(blog._id);
                toUpdateUser.save();
            }
        });
        res.redirect("/myBlogs");
        }
    }
);
app.put("/myBlogs/:id",ensureAuthenticated,(req,res)=>{
    Blog.findByIdAndUpdate(req.params.id,{
        title:req.body.title,
        details:req.body.details,
    }).then(()=>{
        res.redirect("/myBlogs");
    });
});
app.delete("/myBlogs/:id",ensureAuthenticated,(req,res)=>{
    Blog.remove({_id:req.params.id},()=>{
        User.findByIdAndUpdate(req.user.id,{$pull:{blogs:req.params.id}},()=>{
            res.redirect("/myBlogs");
        });
    });
});

//comment routing and entry
app.get("/commentBlog/:id",ensureAuthenticated,(req,res)=>{
    Blog.findById(req.params.id).lean().populate({path:"author",model:User})
    .then((commentToBlog)=>{
        res.render("commentBlog",{blog:commentToBlog});
    });
});
app.put("/commentBlog/:id",ensureAuthenticated,(req,res)=>{
    Blog.findByIdAndUpdate(req.params.id,{
        $push:{
            comments:{
                commentDetails:req.body.comment,
                commentUser:req.user.username
                }
            }
    }).then(()=>{
        res.redirect("/blogs");
    });
});

//error routing
app.use((req,res,next)=>{
    res.status(404);
    res.render("404");
});
app.use((req,res,next)=>{
    res.status(500);
    res.render("500");
});


const PORT=5000;

app.listen(PORT,()=>{
    console.log(`Server started on port ${PORT}`);
});