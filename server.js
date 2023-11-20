const express = require('express')
const app = express()
const { MongoClient, ObjectId } = require('mongodb');
const methodOverride = require('method-override')
const bcrypt = require('bcrypt')

app.use(methodOverride('_method'))
// 서버에도 css 파일 등록해야함
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs') 
// 요청.body를 쓸수있게해주는 코드
app.use(express.json())
app.use(express.urlencoded({extended:true}))
 // 여기 코드 밑에있는 모든 API들은 checkLogin 미들웨어함수가 다 적용됨
    //app.use(checkLogin)

// passport 라이브러리 셋
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const MongoStore = require('connect-mongo')


app.use(passport.initialize())
app.use(session({
    secret: '암호화에 쓸 비번',
    resave : false,
    saveUninitialized : false,
    // cookie는 세션에 저장된 시간을 정할 수 있음
    cookie : {maxAge : 60 * 60 * 1000},
    store : MongoStore.create({
        mongoUrl : 'mongodb+srv://whdgjs7300:qwer1234@cluster0.ef3bhk8.mongodb.net/?retryWrites=true&w=majority',
        dbName : 'forum'
    })
}))

app.use(passport.session()) 

const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3');
const connectDB = require('./database.js');
const s3 = new S3Client({
    region : 'ap-northeast-2',
    credentials : {
        accessKeyId : process.env.S3_KEY,
        secretAccessKey : process.env.S3_SECRET
    }
    })

    const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'jongheonforum1',
        key: function (요청, file, cb) {
        cb(null, Date.now().toString()) //업로드시 파일명 변경가능
        }
    })
})



let db;

connectDB.then((client)=>{
    console.log('DB연결성공')
    db = client.db('forum')
    app.listen(7070, () => {
        console.log('http://localhost:7070 에서 서버 실행중')
    })
    }).catch((err)=>{
    console.log(err)
    }) 



// get = 유저가 url 주소로 접속하면 거기에 맞는 데이터를 줌 
function checkLogin(요청, 응답, next) {
    
    if(!요청.user) {
        응답.send('로그인 하세요')
    }
    // 다음 코드로 진행해주세요 (사용하지 않으면 무한대기)
    next()
}
   

// 미들웨어 코드 (url, 요청응답 사이에 들어감 함수가)
app.get('/', checkLogin, (요청, 응답) => {
   // 함수(요청, 응답)
    응답.sendFile(__dirname + '/index.html')
}) 

app.get('/news', (요청, 응답) => {
    // 데이터 보내기
    db.collection('post').insertOne({title: '어쩌구'})
    응답.send('뉴스페이지')
}) 

app.get('/list', async (요청, 응답) => {
    // db 에서 데이터 가져오는 문법
    let result = await db.collection('post').find().toArray()
    응답.render('list.ejs', { 글목록 : result});

}) 

app.get('/write', (요청, 응답) => {
    응답.render('write.ejs')
}) 


app.post('/add',upload.single('img1') ,async(요청, 응답) => {
    
    try {
        if(요청.body.title === ""){
            응답.send('제목 입력하세요')
        }else {
            // 유저가 보낸 데이터 DB에 저장
            await db.collection('post').insertOne({
                title : 요청.body.title, 
                content: 요청.body.content,
                img : 요청.file? 요청.file.location : '',
                user : 요청.user._id,
                username : 유저아이디
            })
            // 서버 기능이 끝나면 항상 응답을 해줘야함 !!
            // redirect는 요청이 끝나면 해당 url로 이동시킴
            응답.redirect('/list')
        }  
    }catch(e) {
        응답.status(500).send('서버 에러남')
    }
    

    
}) 

app.get('/detail/:id', async (요청, 응답)=>{
    // 예외처리를 해야 서버가 안전함
    try {
        let result2 = await db.collection('comment').find({ parentId :new ObjectId(요청.params.id)}).toArray()
        

        let result = await db.collection('post').findOne({ _id : new ObjectId(요청.params.id)})
        응답.render('detail.ejs', {result : result, result2 : result2})
        console.log(result)
        if(result === null) {
            응답.status(404).send('이상한 url 입력함')
        }
    }catch(e) {
        응답.status(404).send('이상한 url 입력함')
    }
    
})

// 수정 기능


app.get('/edit/:id', async (요청, 응답) => {
    let result = await db.collection('post').findOne({ _id : new ObjectId(요청.params.id) })
    응답.render('edit.ejs', { result : result})
    
    console.log(result)
})


app.put('/edit', async (요청, 응답)=>{
    // updateOne은 객체의 키값이 찾으려는 값
    // set은 그 찾은 객체의 데이터를 수정할 값

    // await db.collection('post').updateMany({ _id : 1 },
    //         {$inc : { like : 2}
    //     })


        await db.collection('post').updateOne({ _id : new ObjectId(요청.body.id) },
            {$set : { title : 요청.body.title, content : 요청.body.content }
        })
        console.log(요청.body.content)
        응답.redirect('/list');
    }) 

app.delete('/delete', async (요청, 응답)=>{
    console.log(요청.query);
    db.collection('post').deleteOne({ 
        _id : new ObjectId(요청.query.docid),
        user : new ObjectId(요청.user._id)
    })
    // ajax를 쓰는 이유 새로고침이 안되고 바로 데이터를 요청, 응답할 수 있기때문에 
    // 응답.render, redierct 같은 거 안씀
    응답.send('삭제완료')
})

app.get('/list/:id', async (요청, 응답) => {
    // db 에서 데이터 가져오는 문법 (limit 데이터의 갯수 정하기 {페이지네이션구현})
    let result = await db.collection('post').find().skip((요청.params.id - 1) * 5).limit(5).toArray()
    응답.render('list.ejs', { 글목록 : result});

}) 

app.get('/list/next/:id', async (요청, 응답) => {
    // db 에서 데이터 가져오는 문법 (limit 데이터의 갯수 정하기 {페이지네이션구현})
    let result = await db.collection('post').find({_id : {$gt : new ObjectId(요청.params.id)}}).skip((요청.params.id - 1) * 5).limit(5).toArray()
    응답.render('list.ejs', { 글목록 : result});

}) 

//session 방식의 로그인/ 화원가입 방식
// passport 라이브러리(회원인증)

passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    // 제출한 아이디/ 비번 검사하는 코드 적는곳
    let result = await db.collection('user').findOne({ username : 입력한아이디})
    if (!result) {
        return cb(null, false, { message: '아이디 DB에 없음' })
        }
        // 비밀번호 해싱 비교해야함 !
        if (await bcrypt.compare(입력한비번, result.password)) {
        return cb(null, result)
        } else {
        return cb(null, false, { message: '비번불일치' });
        }
}))

// 세션 만들어 줌
passport.serializeUser((user, done) => {
    process.nextTick(() => {
        done(null, { id: user._id, username: user.username })
    })
})
// 유저의 정보 알려줌(쿠키 분석)
passport.deserializeUser(async(user, done) => {
    let result = await db.collection('user').findOne({_id : new ObjectId(user.id) })
    delete result.password
    process.nextTick(() => {
        return done(null, result)
        })
    })



app.get('/login', async (요청, 응답) => {
    console.log(요청.user)
    응답.render('login.ejs')

}) 

app.post('/login', async (요청, 응답, next) => {
    
    passport.authenticate('local', (error, user, info)=>{
        if (error) return 응답.status(500).json(error)
        if (!user) return 응답.status(401).json(info.message)
        요청.logIn(user, (err)=> {
            if (err) return next(err)
            응답.redirect('/')
        })
    })(요청, 응답, next)
    
}) 
// 회원 가입
app.get('/register', (요청, 응답)=>{
    응답.render('register.ejs')

})

app.post('/register', async(요청, 응답)=>{
    // 비밀번호 해싱해줌 
    let 해시 = await bcrypt.hash(요청.body.password, 10)
    

    await db.collection('user').insertOne({
        username : 요청.body.username,
        password : 해시
    })
    // 비밀번호 해싱 알고리즘(보안) - bcrypt
    응답.redirect('/')
})


app.use('/shop', require('./routes/shop.js'))
    // find 함수는 document가 많아질 수록 느려짐
    
app.get('/search', async(요청, 응답) => {
    // 몽고 db index로 빠르게 찾기 (전체 도큐먼트를 보는게아니라 해당 도튜먼트 바로 봄)
    // search index는 aggregate 함수를 써서 데이터를 찾음 (aggregate는 여러 조건을 넣을 수 있음)
    let 검색조건 = [
        {$search : {
            index : 'title_index',
            text : { query : 요청.query.val , path : 'title' }
            }},
            // sort는 원하는 데이터 별 정렬할 수 있음 
            // limit는 검색결과 데이터 수를 제한할수 있음
            // skip은 위에서 10개를 스킵하고 나머지 결과를 보여주세요
            // project는 데이터 필드를 숨길수 있음 _id: 0은 아이디는 숨겨주세요 라는 의미
            
        ]

    let result = await db.collection('post').aggregate(검색조건).toArray()
    console.log('검색결과' , result)
    응답.render('search.ejs',{글목록 : result})
}) 

app.post('/comment', async (요청, 응답)=>{
    let result = await db.collection('comment').insertOne({
        content : 요청.body.content,
        writerId : new ObjectId(요청.user?._id),
        writer : 요청.user?.username,
        parentId : new ObjectId(요청.body.parentId)
        })
    
        응답.redirect('back')
    }) 
    app.get('/chat/request', async (요청, 응답)=>{
        await db.collection('chatroom').insertOne({
            member : [요청.user._id, new ObjectId(요청.query.writerId)],
            date : new Date()
            })
            응답.redirect('채팅방목록페이지')
        })


        app.get('/chat/list', async (요청, 응답)=>{
            let result = await db.collection('chatroom').find({ member : 요청.user._id }).toArray()
            응답.render('chatList.ejs', {글목록 : result})
        }) 

        app.get('/chat/detail', async (요청, 응답)=>{
            응답.render('chatDetail.ejs')
        }) 

        app.get('/chat/detail/:id', async (요청, 응답)=>{
            let result = await db.collection('chatroom').findOne({ _id : new ObjectId(요청.params.id)})
            응답.render('chatDetail.ejs', {result : result})
        }) 