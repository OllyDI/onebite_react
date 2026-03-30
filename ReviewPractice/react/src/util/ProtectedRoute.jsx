import { useEffect, useState, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from './api';
import { UserContext } from './UserContext';

const isMobile = () => {
    return /android|iphone|ipad|ipod/i.test(
        navigator.userAgent
    );
}

export default function ProtectedRoute({ children }) {
    const [ok, setOk] = useState(null);
    const { setUser } = useContext(UserContext);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await api.get('/api/me');

                setUser(res.data.user);
                setOk(true);

            } catch {
                try {
                    if (isMobile()) {
                        const refreshToken = localStorage.getItem('refreshToken');

                        await api.post('/api/refresh', {}, 
                            { 
                                headers: { Authorization: `Bearer ${refreshToken}` } 
                            }
                        )
                    } else {
                        await api.post('/api/refresh', {}, { withCredentials: true });
                    }
                    const res = await api.get('/api/me');
                    
                    setUser(res.data.user);
                    setOk(true);
                } catch {
                    setOk(false);
                }
            }
        }
        checkAuth();
    }, [setUser]);

    if (ok === null) return <div>로딩중...</div>;
    if (!ok) return <Navigate to="/login" replace />;
    return children;
}