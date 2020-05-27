if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
//Initial
const port = process.env.PORT || 3000;
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const dateFormat = require('dateformat')

//Login and Register
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const initializePassport = require('./passport-config')

initializePassport(
  passport,
 email => users.find(user => user.email === email),
 id => users.find(user => user.id === id)
)
const users = []

//Datenbank
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/shoutbox.db');
const dbRegister = new sqlite3.Database('./db/register.db');
const dbEntries = new sqlite3.Database('./db/entries.db');

//App
app.set('view-engine', 'ejs')
app.use('/public', express.static(process.cwd() + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

//Start
app.get('/', checkNotAuthenticated, (req, res) => {
  res.render('start.ejs')
})

app.get('/start', checkNotAuthenticated, (req, res) => {
  res.render('start.ejs')
})

//Messages
app.get('/messages', checkNotAuthenticated, async (req, res) => {
  db.all('SELECT * FROM shouts', (err, shouts) => {
    res.render('messages.ejs', { shouts })
  });
})

app.get('/api/shouts', checkNotAuthenticated, async (req, res) => {
  db.all('SELECT * FROM shouts', (err, shouts) => {
    res.json(shouts)
  });
});

app.post('/api/shouts', (req, res) => {
  if (req.body.username && req.body.message) {
    db.run('INSERT INTO shouts(username, message) VALUES (?, ?);', [req.body.username, req.body.message], function(err) {
      if(err) {
        res.json({error: err});
      } else {
        res.json({
          ...req.body,
            id: this.lastID,
          });
      }
    });
  } else {
    res.json({error: "Request body is not correct"});
  }
});

//Entries
app.get('/entries', checkNotAuthenticated, (req, res) => {
    const pageTitle = 'This is a title';
    dbEntries.all("SELECT * from entries", (err, rows) => {
        if (err) {
          throw err
        }
        res.render('entries.ejs', { 
         title: pageTitle,
         EntryData: rows,
        });
    });
})

app.get('/index', checkAuthenticated, async(req, res) => {
    res.render('index.ejs');
})

app.post('/index', checkAuthenticated, async(req, res) => {
    
    dbEntries.run('INSERT INTO entries(date, title, username, entry) VALUES(?, ?, ?, ?);', 
    [dateFormat(),req.body.EntryTitle, req.body.EntryUsername, req.body.Entry], err => {
    if (err) {
       res.json({error: "Request body is not correct"});
    }
    res.redirect('/index')
  })
})

//Login
app.get('/login', checkNotAuthenticated, (req, res) => {
    dbRegister.all("SELECT * from registerData", (err, rows) => { 
        if (err) {
          throw err
        }
        rows.forEach(entry=>{
            users.push({             
                id: entry.id, 
                name: entry.name,
                email: entry.email,
                password: entry.password
            
             })
        })
    })
  res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

//Register
app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
    if(req.body.name && req.body.email && req.body.password && req.body.authentication==='secret'){
        //try {
            const hashedPassword = await bcrypt.hash(req.body.password, 10)
            //users.push({
              //id: Date.now().toString(),
              //name: req.body.name,
              //email: req.body.email,
              //password: hashedPassword
            //})
            dbRegister.run('INSERT INTO registerData(id, name, email, password) VALUES (?, ?, ?, ?);', 
                [Date.now().toString(), req.body.name, req.body.email, hashedPassword], 
                (err) => {
                if(err) {
                   res.json({error: err});
                  
                } else {
                    res.redirect('/login') 
                }
            });
            
         //} catch {
           //  res.redirect('/register')
         //}
	}else{
     res.redirect('/register') 
     
	}
  
})

//Logout
app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/entries')
})

//Authentication
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/index')
  }
  next()
}

//Server
const server = app.listen(port, () => {
 console.log(`Server listening on port ${port}…`)
});

module.export = server