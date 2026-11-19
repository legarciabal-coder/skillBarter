const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const { initFirebase, realVerifyToken } = require('./config/firebase');
const { createApp } = require('./app');

const { db } = initFirebase();
const app = createApp({ db, verifyToken: realVerifyToken });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`SkillBarter API escuchando en http://localhost:${port}`));