import admin from 'firebase-admin';
import serviceAccount from "./firebase-service-account-file.js"
import algoliaSearch from 'algoliasearch';

import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ecommerceapplication-10d5c-default-rtdb.asia-southeast1.firebasedatabase.app"
});

import express from 'express';;
import mainController from './controllers/MainController.js';
import expressSession from 'express-session';

const app = express();
const port = process.env.PORT || 5000;

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

//  Gửi thông báo đến người dùng khi có tin nhắn đến
let userChatRef = firebaseDatabase.ref("chats/list");

// userChatRef.limitToLast(1)
//     .get()
//     .then((snapshot) => {
//         snapshot.forEach((snapshot) => {
//             console.log(snapshot.val())
//         })
//         // console.log(snapshot.)
//     })

let userChatMessageRef = firebaseDatabase.ref("chats/messages");
userChatMessageRef.on('child_changed', (childSnapshot, prevChildKey) => {
    let chanelId = childSnapshot.key;
    console.log(chanelId);
})

// userChatMessageRef.on('child_changed', (childSnapshot, prevChildKey) => {
//     let chanelId = childSnapshot.key;
//     userChatMessageRef.child(chanelId).orderByChild("sentTime")
//         .limitToLast(1).child(get()
//         .then((snapshot) => {
//             let sender = snapshot.val();
//             console.log()
//         })
