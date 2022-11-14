import admin from 'firebase-admin';
import serviceAccount from "./firebase-service-account-file.js"
import algoliaSearch from 'algoliasearch';

import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const ALGOLIA_APP_ID = "VX2DXN1DZM";
const ALGOLIA_ADMIN_KEY = "4fd97bb569cc176b6a3b16c96890ea28";
const ALGOLIA_INDEX_NAME = 'users';

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    apiKey: "AIzaSyA-lJ_4LUiajxmgetN48UuTt3Wt4VO01Oo",
    authDomain: "ecommerceapplication-10d5c.firebaseapp.com",
    databaseURL: "https://ecommerceapplication-10d5c-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ecommerceapplication-10d5c",
    storageBucket: "ecommerceapplication-10d5c.appspot.com",
    messagingSenderId: "557453445554",
    appId: "1:557453445554:web:de9e3d14aac398fcecfcab",
    measurementId: "G-D4ZRS8TCGB"
});

import express from 'express';;
import mainController from './controllers/MainController.js';
import expressSession from 'express-session';

const app = express();
const port = process.env.PORT || 5000;

app.use(expressSession({
    secret: "HoangDao",
    saveUninitialized: true,
    resave: true,
    cookie: {
        maxAge: 36000000
    }

}));
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

let client = algoliaSearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
let index = client.initIndex(ALGOLIA_INDEX_NAME);
let firebaseDatabase = admin.database();
let ref = firebaseDatabase.ref("/users");
ref.on('child_changed', (childSnapshot, prevChildKey) => {
    console.log(childSnapshot.val());

    let user = childSnapshot.val();
    user.objectID = user.id;

    index.saveObject(user, (err, content) => {
        res.status(200).send(content());
    })
})

function sendCloudMessage(registrationTokens, data) {
      const message = {
        data: data,
        tokens: registrationTokens,
      };
      
      admin.messaging().sendMulticast(message)
        .then((response) => {
          console.log(response.successCount + ' messages were sent successfully');
        });
}

//  Gửi thông báo đến người dùng khi có tin nhắn đến
let userChatMessageRef = firebaseDatabase.ref("chats/messages");
let userChatRef = firebaseDatabase.ref("chats/list");
let userDeviceRef = firebaseDatabase.ref("userDevices");
let userRef = firebaseDatabase.ref("users");
userChatMessageRef.on('child_changed', (childSnapshot, prevChildKey) => {
    let chanelId = childSnapshot.key;
    userChatMessageRef.child(chanelId).orderByChild("sentTime")
        .limitToLast(1).get()
        .then((messageSnapshot) => {
            //  Lấy message
            messageSnapshot.forEach((snapshot1) => {
                let sender = snapshot1.val().senderId;
                //  Lấy thông tin người gửi
                userRef.child(sender).get()
                    .then((userSnapshot) => {
                        console.log(userSnapshot.val())
                        //  Lấy id người nhận
                        userChatRef.child(chanelId).child("members")
                        .get()
                        .then((snapshot2) => {
                            snapshot2.val().forEach((memberId) => {
                                if (memberId != sender) {
                                    //  Lấy token của thiết bị nhận thông báo
                                    userDeviceRef.child(memberId).child("deviceMessageToken")
                                        .get()
                                        .then((tokenSnapshot) => {
                                            if (tokenSnapshot.exists()) {
                                                
                                                console.log(tokenSnapshot.val())
                                                //  Gửi thông báo
                                                sendCloudMessage([tokenSnapshot.val()], {
                                                    title: `Tin nhắn từ ${userSnapshot.val().fullName}`,
                                                    messageType: snapshot1.val().type,
                                                    messageContent: snapshot1.val().content,
                                                    chanelId: chanelId
                                                })
                                            }
                                        })
                                }
                            })
                        })
                    })
            })
        })
})

app.get("/", (req, res) => {
    res.send("Server is running.")
})
app.listen(port, () => { });



