import mongoose from "mongoose";
const {Schema}=mongoose;
import passportLocalMongoose from "passport-local-mongoose";

const CommentSchema=new Schema({
    commentDetails:{
        type:String,
        required:true,
    },
    commentUser:{
        type:String,
        required:true,
    },
    commentTime:{
        type:Date,
        default:Date.now,
    },
});
const BlogSchema=new Schema({
    title:{
        type:String,
        required:true,
    },
    details:{
        type:String,
        required: true,
    },
    comments:[CommentSchema],
    time:{
        type:Date,
        default:Date.now,
    },
    author:{
        type:Schema.Types.ObjectId,
        ref:"user",
        required:true,
    }
});
const UserSchema=new Schema({
    blogs:[{
        type:Schema.Types.ObjectId,
        ref:"blogs",
    }]
});

// added by Clement on 13/6/2022, also line 61
const SubscriberSchema = new Schema({
    subscriberName: {
        type: String,
        required: true,
    },
    subscriberEmail: {
        type: String,
        required: true,
    },
    followAuthor: {
        type: String,
        required: true,
    }
});

UserSchema.plugin(passportLocalMongoose);
const User=mongoose.model("users",UserSchema,"users");
const Blog=mongoose.model("blogs",BlogSchema,"blogs");
const Subscriber = mongoose.model("subscribers", SubscriberSchema, "subscribers");

// Subscriber added by Clement on 13/6/2022
export {User,Blog, Subscriber};