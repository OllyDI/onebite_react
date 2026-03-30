import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from "./Button"
import { api } from '../util/api'
import './UserLogin.css'



const UserLogin = () => {

    const [userInfo, setUserInfo] = useState({
        id: '',
        pw: '',
    })
    const nav = useNavigate();

    const isMobile = () => {
        return /android|iphone|ipad|ipod/i.test(
            navigator.userAgent
        );
    }

    const onClickLogin = async (e) => {
        e.preventDefault();

        try {
            const res = await api.post('/api/login', userInfo);

            if (isMobile()) {
                const { accessToken, refreshToken } = res.data;

                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);
            }
            nav('/');
        } catch (err) {
            alert(err.response?.data?.message || '로그인 실패');
        }
    }

    const onChangeUser = (e) => {
        const {name, value} = e.target;

        setUserInfo({
            ...userInfo,
            [name]: value
        })
    }

    return (
        <form className="user_form" onSubmit={onClickLogin}>
            <div className="user_info">
                <input  name='id' onChange={onChangeUser} placeholder="아이디"/>
                <input type="password" name='pw' onChange={onChangeUser} placeholder="패스워드"/>
                <Button text={'로그인'} type={'POSITIVE'}/>
            </div>
            <div className="user_reg">
                <p onClick={() => {nav('/register')}}>회원가입</p>
            </div>
        </form>

    )
}

export default UserLogin