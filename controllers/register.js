import bcrypt from 'bcrypt-nodejs';
const db = Knex({
    client: 'pg',
        connection: {
        host : '127.0.0.1',
        user : 'postgres',
        password : '2207',
        database : 'smartbrain'
    }
})
const handleRegister = (req, res) =>{
    const {name, email, password} = req.body;
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
}

export {handleRegister};