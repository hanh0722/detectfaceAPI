import express from 'express';
import bodyparser from 'body-parser';
import bcrypt, { hash } from 'bcrypt-nodejs';
import cors from 'cors';
import Knex from 'knex';
import Clarifai from 'clarifai';
const app1 = new Clarifai.App({
    apiKey: '0b051cdb86454824b528766d97f83127',
});


const app = express();
const db = Knex({
    client: 'pg',
        connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    }
})

// using middleware for body
// using cors middleware to fetch data to the front end 
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(cors());

app.get('/' , (req, res) =>{
    res.json('first root');
})

app.post('/signin', (req, res) =>{
    if(!req.body.email || !req.body.password){
        return res.status(404).json('incorrect login!');
    }
    db.select('email', 'hash').from('login')
    .where('email', '=', req.body.email)
    .then(data =>{
        // compare with hash
        const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
        if(isValid){
            db.select('*').from('users').where('email', '=', req.body.email)
            .then(response => res.json(response[0]))
            .catch(err => res.status(404).json('unable to get user'));
        }else{
            res.status(404).json('wrong credentials');
        }
    }).catch(err => res.status(404).json('wrong credentials'));
})

app.post('/register', (req, res) =>{
    const {name, email, password} = req.body;
    if(!name || !email || !password){
        return res.status(404).json('incorrect form submission');
    }
    // name of table we want to insert to database
    // .returning('*') => return to all column
    // hash password
    // after we have password we update both table -> users and login
    // transaction => codeblock we make sure that we're doing the multiple operations on a database
    // but if one fails then they all fail
    const hash = bcrypt.hashSync(password);
    // trx is an object
   db.transaction(trx =>{
       trx.insert({
           hash: hash,
           email: email
       })
       .into('login')
       .returning('email')
       .then(loginEmail =>{
           return trx('users')
           .returning('*')
           .insert({
               email: loginEmail[0],
               name: name,
               joined: new Date()
           })
           .then(user =>{
               res.json(user[0]);
           })
       })
       .then(trx.commit)
       .catch(trx.rollback);
   })
   .catch(err => res.status(404).json('err'));
})

app.get('/profile/:id', (req, res) =>{
    const { id } = req.params;
    db.select('*').from('users').where({
        id: id
    })
    .then(user =>{
        if(user.length === 0){
            res.json('not found');
        }else{
            res.json(user[0]);
        }
    }).catch(err => res.json('err'))
})

app.put('/image', (req, res) =>{
    const { id } = req.body;
    db('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries').then(entries => res.json(entries))
    .catch(err => res.status(404).json('not fount the id'));
})

app.post('/imageURL', (req, res) =>{
    app1.models.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
    .then(data =>{
        res.json(data);
    }).catch(err => res.status(400).json('unable to work with API'));
})

app.listen(process.env.PORT || 3000, () =>{
    console.log(`app is running on port ${process.env.PORT}`)
});
