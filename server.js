const express = require('express')
const app = express()
const { MongoClient, ObjectId } = require('mongodb');
const methodOverride = require('method-override')


app.use(methodOverride('_method'))
// 서버에도 css 파일 등록해야함
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs') 
// 요청.body를 쓸수있게해주는 코드
app.use(express.json())
app.use(express.urlencoded({extended:true}))



let db;
const url = 'mongodb+srv://whdgjs7300:qwer1234@cluster0.ef3bhk8.mongodb.net/?retryWrites=true&w=majority'
new MongoClient(url).connect().then((client)=>{
    console.log('DB연결성공')
    db = client.db('forum')
    }).catch((err)=>{
    console.log(err)
})


app.listen(7070, () => {
    console.log('http://localhost:7070 에서 서버 실행중')
})

// get = 유저가 url 주소로 접속하면 거기에 맞는 데이터를 줌 

app.get('/', (요청, 응답) => {
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


app.post('/add', async(요청, 응답) => {
    // 유저가 보낸 데이터 확인
    console.log(요청.body)
    try {
        if(요청.body.title === ""){
            응답.send('제목 입력하세요')
        }else {
            // 유저가 보낸 데이터 DB에 저장
            await db.collection('post').insertOne({title : 요청.body.title, content: 요청.body.content})
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
        let result = await db.collection('post').findOne({ _id : new ObjectId(요청.params.id)})
        응답.render('detail.ejs', {result : result})
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
    db.collection('post').deleteOne({ _id : new ObjectId(요청.query.docid)})
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