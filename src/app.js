import admin from 'firebase-admin';
import serviceAccount from "./firebase-service-account-file.js"
import algoliaSearch from 'algoliasearch';

const ALGOLIA_APP_ID = "VX2DXN1DZM";
const ALGOLIA_ADMIN_KEY = "4fd97bb569cc176b6a3b16c96890ea28";
const ALGOLIA_INDEX_NAME = 'users';

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ecommerceapplication-10d5c-default-rtdb.asia-southeast1.firebasedatabase.app"
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

app.get("/", (req, res) => {
    res.send("Server is running.")
})
app.listen(port, () => { });


