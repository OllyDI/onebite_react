const express = require('express');
const app = express();
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
// require('dotenv').config();
const User = require('./db/db_user.js');
const Diary = require('./db/db_diary.js');
const isProd = process.env.NODE_ENV === 'production';





// JWT 생성
const createAccessJWT = (user) => jwt.sign(
    { user_id: user.user_id },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '30m' }
)
const createRefreshJWT = (user) => jwt.sign(
    { user_id: user.user_id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
)


// JWT 발급
const sendJWTCookies = (req, res, access, refresh) => {

    const isMobile = (req) => {
        const ua = req.headers['user-agent'] || '';
        return /android|iphone|ipad|ipod/i.test(ua);
    }

    // mobile: jwt 토큰
    if (isMobile(req)) {
        return res.json({ 
            accessToken: access,
            refreshToken: refresh
         })
    }

    // pc: jwt 쿠키, 세션
    res.cookie('access_token', access, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'None' : 'Lax',
        maxAge: 30 * 60 * 1000,
        path: '/',
    });
    res.cookie('refresh_token', refresh, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'None' : 'Lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
    })

    return res.json({ message: 'success' })
}


app.use(cors({
    origin: [process.env.CLIENT_URL, process.env.CLIENT_URL_LOCAL],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// local register
app.post('/api/register', async (req, res) => {
    try {
        const { id, pw, name } = req.body;
    
        if (!id || !pw || !name) {
            return res.status(400).json({ message: '모든 필드를 입력해주세요' });
        }
    
        const exist = await User.findOne({ where: {id} });
        if (exist) {
            return res.status(409).json({ message: '이미 존재하는 ID입니다.' });
        }
    
        const hashed = await bcrypt.hash(pw, 10);
        await User.create({ id, pw: hashed, name });
        res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    } catch (err) {
        res.status(500).json({ message: '서버 오류' });
    }
})


// local login
app.post('/api/login', async (req, res) => {
    try { 
        const {id, pw} = req.body;
    
        if (!id || !pw) {
            return res.status(400).json({ message: '아이디 또는 비밀번호 확인을 확인하세요.' });
        }
    
        const user = await User.findOne({ where: {id} });
        if (!user) return res.status(401).json({ message: '아이디가 존재하지 않습니다.' });
    
        const ok = await bcrypt.compare(pw, user.pw);
        if (!ok) return res.status(401).json({ message: '비밀번호가 불일치합니다.' });
    
        const accessToken = createAccessJWT(user);
        const refreshToken = createRefreshJWT(user);
    
        user.refresh_jwt = refreshToken;
        await user.save();
    
        return sendJWTCookies(req, res, accessToken, refreshToken);
    } catch (err) {
        console.log('login err', err);
        res.status(500).json({ message: '서버 오류' })
    }
})


// JWT authenticate
const authMiddleware = (req, res, next) => {
    let token = null;

    // mobile
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    
    // pc
    if (!token) {
        token = req.cookies.access_token;
    }

    if (!token) {
        return res.status(401).json({ message: '토큰이 존재하지 않습니다.' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.userId = payload.user_id;
        next();
    } catch (err) {
        return res.status(401).json({ message: '토큰이 만료되었거나 유효하지 않습니다.' })
    }
}


// 로그인 정보 가져오기
app.get('/api/me', authMiddleware, async (req, res) => {
    const user = await User.findOne({
        where: { user_id: req.userId },
        attributes: ['user_id', 'name', 'created_at']
    });

    res.json({ user });
})


// JWT refresh
app.post('/api/refresh', async (req, res) => {
    let token = req.cookies.refresh_token;

    if (!token) {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        return res.status(401).json({ message: '리프레시 토큰이 없습니다.' })
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findOne({ 
            where: { user_id: payload.user_id }
        });
        if (!user || user.refresh_jwt !== token) {
            return res.status(403).json({ message: '리프레시 토큰이 유효하지 안습니다.' })
        }

        const newAccess = createAccessJWT(user);
        const newRefresh = createRefreshJWT(user);
        user.refresh_jwt = newRefresh;
        await user.save();

        return sendJWTCookies(req, res, newAccess, newRefresh);
    } catch (err) {
        return res.status(403).json({ message: '리프레시에 실패했습니다.' });
    }
})


// 로그아웃
app.post('/api/logout', async (req, res) => {
    const token = req.cookies.refresh_token;
    if (token) {
        try {
            const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
            const user = await User.findOne({
                where: { user_id: payload.user_id },
            });
            if (user) {
                user.refresh_jwt = null;
                await user.save();
            }
        } catch (err) {}
    }
    res.clearCookie('access_token', { 
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'None' : 'Lax',
        path: '/',
    })
    res.clearCookie('refresh_token', { 
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'None' : 'Lax',
        path: '/',
    })
    res.json({ message: '로그아웃 성공' });
})


// 회원 다이어리 가져오기
app.post('/api/diary', authMiddleware, async (req, res) => {
    const id = req.userId;

    try {
        const diaries = await Diary.findAll({
            where: { user_id: id }
        })
        res.status(200).json({diaries});
    } catch (err) {
        console.error('diary table load error', err);
        res.status(500).json({ message: '데이터를 불러오지 못했습니다.' });
    }   
})


// 다이어리 생성
app.post('/api/create_diary', authMiddleware, async (req, res) => {
    const { createdDate, emotionId, content } = req.body;
    const diary = { createdDate, emotionId, content, user_id: req.userId };

    try {
        await Diary.create(diary);
        res.status(200).json({ message: '저장이 완료되었습니다.' })
    } catch (err) {
        console.error('diary create error', err);
        res.status(500).json({ message: '데이터 저장에 실패했습니다. '})
    }
})


// 다이어리 수정
app.post('/api/update_diary', authMiddleware, async (req, res) => {
    const { id, createdDate, emotionId, content } = req.body;

    try {
        const [updatedCount] = await Diary.update(
            { createdDate, emotionId, content }, 
            { where: { id, user_id: req.userId } }
        );
        if (updatedCount === 0) {
            return res.status(404).json({ message: '수정할 다이어리가 없습니다.' });
        }
        res.status(200).json({ message: '업데이트가 완료되었습니다.' })
    } catch (err) {
        console.error('diary update error', err);
        res.status(500).json({ message: '데이터 업데이트에 실패했습니다. '})
    }
})


// 다이어리 삭제
app.post('/api/delete_diary', authMiddleware, async (req, res) => {
    const id = req.body.id;
    try {
        const deletedCount = await Diary.destroy({ 
            where: { 
                id: id,
                user_id: req.userId
            } 
        });
        if (deletedCount === 0) {
            return res.status(404).json({ message: '삭제할 다이어리가 없습니다.' });
        }
        res.status(200).json({ message: '삭제가 완료되었습니다.' })
    } catch (err) {
        console.error('diary delete error', err);
        res.status(500).json({ message: '데이터 삭제에 실패했습니다. '})
    }
})


const PORT = 15001;
app.listen(PORT, () => {
    console.log('server listening on port 15001');
})
