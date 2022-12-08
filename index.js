import admin from 'firebase-admin';
import serviceAccount from "./src/firebase-service-account-file.js"
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

import express from 'express';
import mainController from './src/controllers/MainController.js';
import notificationController from './src/controllers/NotificationController.js';
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

function sendCloudMessagePromise(registrationTokens, data) {
    return new Promise((resolve, reject) => {
        const message = {
            data: data,
            tokens: registrationTokens,
          };
          
          admin.messaging().sendMulticast(message)
            .then((response) => {
              console.log(response.successCount + ' messages were sent successfully');
              resolve(response);
            });
    })
}

let userChatMessageRef = firebaseDatabase.ref("chats/messages");
let userChatRef = firebaseDatabase.ref("chats/list");
let userDeviceRef = firebaseDatabase.ref("userDevices");
let userRef = firebaseDatabase.ref("users");
let postRef = firebaseDatabase.ref("posts/list");
let postCommentRef = firebaseDatabase.ref("posts/comments");
let postReactionRef = firebaseDatabase.ref("posts/reactions");
let notifyRef = firebaseDatabase.ref("/notifications");

function getChatChanelData(chanelId) {
    return new Promise((resolve, reject) => {
        userChatRef.child(chanelId)
            .get().then((chanelSnapshot) => {
                resolve(chanelSnapshot.val());
            })
    })
}

function getMessageData(chanelId, messageId) {
    console.log("Message: " + messageId);
    return new Promise((resolve, reject) => {
        userChatMessageRef.child(chanelId).child(messageId)
            .get().then((messageSnapshot) => {
                resolve(messageSnapshot.val());
            })
    })
}

function getPostData(postId) {
    console.log(postId);
    return new Promise((resolve, reject) => {
        postRef
            .child(postId)
            .get().then((postSnapshot) => {
                console.log(postSnapshot.val());
                resolve(postSnapshot.val());
            })
    })
}

function getUserData(userId) {
    return new Promise((resolve, reject) => {
        userRef
            .child(userId)
            .get().then((userSnapshot) => {
                resolve(userSnapshot.val());
            })
    });
}

function getUserDeviceToken(userId) {
    return new Promise((resolve, reject) => {
        userDeviceRef
        .child(userId)
        .child("deviceMessageToken")
            .get()
            .then((tokenSnapshot) => {
                if (tokenSnapshot.exists()) {
                    resolve(tokenSnapshot.val());
                }
            })
    })
}

function insertNotification(userId, notification) {
    let newRef = notifyRef.child(userId).push();
    newRef.set({
        notifyId: newRef.key,
        title: notification.title,
        content: notification.content,
        type: notification.type,
        senderId: notification.senderId,
        sentTime: Date.now() / 1000
    })
}

app.get("/", (req, res) => {
    res.send("Server fwork is running.")
})

app.post('/user/create/notify', (req, res) => {
    console.log(req.body);
    let userId = req.body.userId;

    userRef.child(userId).get()
        .then((snapshot) => {
            let user = snapshot.val();
            user.objectID = user.id;
            index.saveObject(user, (err, content) => {
                res.status(200).send(content());
            })
        })
})

app.post('/user/update/notify', (req, res) => {
    console.log(req.body);
    let userId = req.body.userId;
    userRef.child(userId).get()
        .then((snapshot) => {
            let user = snapshot.val();
            user.objectID = user.id;
            index.saveObject(user, (err, content) => {
                res.status(200).send(content());
            })
        })
})

app.post('/message/notify', (req, res) => {
    console.log(req.body);
    let messageId = req.body.messageId;
    let chanelId = req.body.chanelId;
    console.log(messageId);
    getChatChanelData(chanelId)
    .then(chanelData => {
        getMessageData(chanelId, messageId)
        .then(messageData => {
            let senderId = messageData.senderId;
            let chatMemberIds = chanelData.members;

            getUserData(senderId)
            .then((userData) => {
                for (let uid of chatMemberIds) {
                    if (uid != senderId) {
                        getUserDeviceToken(uid)
                        .then((token) => {
                            sendCloudMessagePromise([token], {
                                title: `Tin nhắn từ ${userData.fullName}`,
                                messageType: messageData.type,
                                messageContent: messageData.content,
                                chanelId: chanelId
                            }).then((response) => {
                                insertNotification(uid, {
                                    title: `Tin nhắn từ ${userData.fullName}`,
                                    type: "Chat notify",
                                    content: messageData.content,
                                    senderId: senderId
                                })
                                let result = {
                                    status: 200,
                                    sent: response.successCount
                                }
                                res.send(JSON.stringify(result));
                            })
                        })
                    }
                }
            })
        })
    })
})

app.post("/post/reaction/notify", (req, res) => {
    console.log(req.body);
    let postId = req.body.postId;
    let userId = req.body.userId;
    console.log(postId);
    console.log(userId);
    getPostData(postId).then((postData) => {
        console.log(postData);
        return getUserData(postData.userId);
    }).then((postOwnerUserData) => {
        getUserDeviceToken(postOwnerUserData.id)
            .then((token) => {
                getUserData(userId).then((userData) => {
                    sendCloudMessagePromise([token], {
                        title: `Lượt thích mới`,
                        messageContent: `${userData.fullName} đã thích bài viết của bạn`
                    }).then((response) => {
                        insertNotification(postOwnerUserData.id, {
                            title: `Lượt thích mới`,
                            type: "Post reaction notify",
                            content: `${userData.fullName} đã thích bài viết của bạn`,
                            senderId: userData.id
                        })
        
                        let result = {
                            status: 200,
                            sent: response.successCount
                        }
                        res.send(JSON.stringify(result));
                    })
                })
            })
    })
});

app.post("/post/comment/notify", (req, res) => {
    console.log(req.body);
    let postId = req.body.postId;
    let userId = req.body.userId;
    console.log(postId);
    console.log(userId);
    getPostData(postId).then((postData) => {
        console.log(postData);
        return getUserData(postData.userId);
    }).then((postOwnerUserData) => {
        getUserDeviceToken(postOwnerUserData.id)
            .then((token) => {
                getUserData(userId).then((userData) => {
                    sendCloudMessagePromise([token], {
                        title: `Bình luận mới`,
                        messageContent: `${userData.fullName} đã bình luận bài viết của bạn`
                    }).then((response) => {
                        insertNotification(postOwnerUserData.id, {
                            title: `Bình luận mới`,
                            type: "Post comment notify",
                            content: `${userData.fullName} đã bình luận bài viết của bạn`,
                            senderId: userData.id
                        })
        
                        let result = {
                            status: 200,
                            sent: response.successCount
                        }
                        res.send(JSON.stringify(result));
                    })
                })
            })
    })
});

app.post("/post/apply/notify", (req, res) => {
    let postId = req.body.postId;
    let userId = req.body.userId;
    console.log("Post apply notify");
    console.log(postId);
    console.log(userId);
    getPostData(postId).then((postData) => {
        console.log(postData);
        return getUserData(postData.userId);
    }).then((postOwnerUserData) => {
        getUserDeviceToken(postOwnerUserData.id)
            .then((token) => {
                getUserData(userId).then((userData) => {
                    sendCloudMessagePromise([token], {
                        title: `Đơn ứng tuyển`,
                        messageContent: `${userData.fullName} đã ứng tuyển công việc của bạn`
                    }).then((response) => {
                        insertNotification(postOwnerUserData.id, {
                            title: `Đơn ứng tuyển`,
                            type: "Post apply notify",
                            content: `${userData.fullName} đã ứng tuyển công việc của bạn`,
                            senderId: userData.id
                        })
        
                        let result = {
                            status: 200,
                            sent: response.successCount
                        }
                        res.send(JSON.stringify(result));
                    })
                })
            })
    })
})

app.post("/post/accept/notify", (req, res) => {
    let postId = req.body.postId;
    let userId = req.body.userId;
    getPostData(postId)
        .then((postData) => {
            getUserDeviceToken(userId).then((token) => {
                sendCloudMessagePromise([token], {
                    title: "Đơn ứng tuyển được chấp nhận",
                    messageContent: `Đơn ứng tuyển cho công việc ${postData.postName} được chấp nhận`
                }).then((response) => {
                    insertNotification(userId, {
                        title: "Đơn ứng tuyển được chấp nhận",
                        type: "Post apply notify",
                        content: `Đơn ứng tuyển cho công việc ${postData.postName} được chấp nhận`,
                        senderId: postData.userId
                    })
    
                    let result = {
                        status: 200,
                        sent: response.successCount
                    }
                    res.send(JSON.stringify(result));
                })
            })
        })
})

app.post("/post/reject/notify", (req, res) => {
    let postId = req.body.postId;
    let userId = req.body.userId;
    getPostData(postId)
        .then((postData) => {
            getUserDeviceToken(userId).then((token) => {
                sendCloudMessagePromise([token], {
                    title: "Đơn ứng tuyển bị từ chối",
                    messageContent: `Đơn ứng tuyển cho công việc ${postData.postName} bị từ chối`
                }).then((response) => {
                    insertNotification(userId, {
                        title: "Đơn ứng tuyển bị từ chối",
                        type: "Post apply notify",
                        content: `Đơn ứng tuyển cho công việc ${postData.postName} bị từ chối`,
                        senderId: postData.userId
                    })
    
                    let result = {
                        status: 200,
                        sent: response.successCount
                    }
                    res.send(JSON.stringify(result));
                })
            })
        })
})

app.listen(port, () => { });

