import express from 'express';
import http from 'http';
import { connect, connection, model, Schema } from 'mongoose';
import sgMail, { MailService } from '@sendgrid/mail';
import { environment } from './env';

const Port = process.env.PORT || 1111;
const app = express();
app.use(express.urlencoded({extended: false}));

//Key
sgMail.setApiKey(environment.SENDGRID_API_KEY);

//Connecting mongoDB
connect(environment.Url);
const db = connection;

db.on('error', () => {
    console.error.bind(console, "Error connecting MongoDB");
});

db.once('open', () => {
    console.log(`Mongo-Db is Connected, the data can be stored now.`);
});

//Creating a schema
const emailSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    name:{
        type: String,
        required: true
    },
    status:{
        type: String,
        enum: ["pass", "fail"],
        required: true,
    },
    type:{
        type: String,
        enum: ["bcc", "to"],
        required:true,

    }
},{
    timestamps: true,
});

//creating the model for schema
const emails = model('emails', emailSchema);


//sending mails
const sendMail = async (msg:any)=>{
    try {
        await sgMail.send(msg);
        console.log('Message sent successfully');
        return true;

    } catch (err: any) {
        console.error(err);
        if (err.response) {
            console.error(err.response.body);
        }
        return false;
    }
};


//Routes
app.get('/', async (req, res)=>{
    let failed,passed;
    const fail = await emails.find({status: "fail"});
    const pass = await emails.find({status: "pass"});
    failed = fail.map((value)=>{
    return {
        email: value.email,
    }
    })
    passed = pass.map((value)=>{
    return {
        email: value.email,
    }
    })

    //  console.log(failed);
    //  console.log(passed);
     return res.status(200).json({status : 200,
        message: "Overall candidates whose results are passed and failed",
        data:{
            success: passed,
            failure: failed
        }
    })
})



app.post('/send', async (req,res)=>{
    if (req.body.email && req.body.name && req.body.status && req.body.type) {
        const stat = req.body.status;
        if((stat.toLowerCase() == 'pass' || req.body.status.toLowerCase() == 'fail')
         && (req.body.type.toLowerCase() == 'bcc' || req.body.type.toLowerCase() == 'to'))
         {
            const msg = {
                to : req.body.email, 
                from: 'iamvamsi999@gmail.com',
                subject: 'Sending with SendGrid is Fun',
                text: `Hi ${req.body.name}, Your result is ${stat} `,
                html: `<h1>Hi ${req.body.name}, Your result is ${stat}</h1>`,
              }
            //   sendMail(msg);
              if (await sendMail(msg)) {
               try {
                const email: any = await emails.findOne({email: req.body.email});
                if (email) {
                    return res.status(200).json({data:{
                        message: "Mail have been sent"
                    }})
                }
                else if (!email) {
                    emails.create({
                        email: req.body.email,
                        name: req.body.name,
                        status: req.body.status.toLowerCase(),
                        type: req.body.type.toLowerCase(),
                    }, (err, email)=>{
                        if (err) {
                            console.log('error creating email');
                            console.log(err);
                            return res.status(500).json({error:"internal server issue"});
                        }else{
                            return res.status(200).json({data:{
                               message : "Message delivered successfully"
                            }});
                        }
                    })
                  }
               } catch (err: any) {
                console.log('error finding email');
                return res.status(500).json({error:"internal server issue"});
               }            
        }else{
            return res.status(200).json({data:{
                message: "You have entered invalid fields",
            }})
        }
    }
}});


// server to run
http.createServer(app).listen(Port, ()=>{console.log(`Server running on port ${Port}`);
})
