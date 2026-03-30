import { useReducer, createContext, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { api } from './util/api'
import { UserContext } from './util/UserContext'
import ProtectedRoute from './util/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import New from './pages/New'
import Diary from './pages/Diary'
import Edit from './pages/Edit'
import Notfound from './pages/Notfound'

import './App.css'

function reducer(state, action) {
  let nextState;
  
  switch(action.type) {
    case 'INIT': {
      return action.data;
    }
    case 'CREATE': {
      nextState = [...state, action.data];
      break;
    } 
    case 'UPDATE': {
      nextState = state.map((item) => 
        String(item.id) === String(action.data.id) 
        ? action.data 
        : item
      );
      break;
    } 
    case 'DELETE': {
      nextState = state.filter((item) => String(item.id) !== String(action.id));
      break;
    } 
    default: return state;
  }
  // localStorage.setItem('diary', JSON.stringify(nextState));
  return nextState;
}

export const DiaryStateContext = createContext();
export const DiaryDispatchContext = createContext();

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, dispatch] = useReducer(reducer, []);
  const [user, setUser] = useState(null);


  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return
    } 
    const init = async () => {
      try {
        const diaries = await api.post('/api/diary', {id: user.user_id});
        const tmpDiaries = diaries.data.diaries;
        let maxId = 0;

        tmpDiaries.forEach((item) => {
          if (Number(item.id) > maxId) { maxId = Number(item.id) }
          item.createdDate = new Date(item.createdDate).getTime();
        })

        dispatch({
          type: 'INIT',
          data: tmpDiaries
        })
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
        return
      }
    }
    init();
  }, [user])

  // 일기 추가
  const onCreate = async (createdDate, emotionId, content, user_id) => {

    try {
      const res = await api.post('/api/create_diary', {
        createdDate,
        emotionId,
        content,
        user_id
      })

      dispatch({
      type: 'CREATE',
      data: {
        createdDate,
        emotionId,
        content,
        user_id
      }
    })

    alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || '알 수 없는 오류가 발생했습니다.');
    }
  }
  
  // 일기 수정
  const onUpdate = async (id, createdDate, emotionId, content, user_id) => {

    try {
      const res = await api.post('/api/update_diary', {
        id,
        createdDate,
        emotionId,
        content,
        user_id
      })

      dispatch({
      type: 'UPDATE',
      data: {
        id,
        createdDate,
        emotionId,
        content,
        user_id
      }
    })

    alert(res.data.message)
    } catch (err) {
      alert(err.response?.data?.message || '알 수 없는 오류가 발생했습니다.')
    }
  }

  // 일기 삭제
  const onDelete = async (id) => {

    try {
      const res = await api.post('/api/delete_diary', { id: id })
      dispatch({
        type: 'DELETE',
        id
      })
      
      alert(res.data.message)
    } catch (err) {
      alert(err.response?.data?.message || '알 수 없는 오류가 발생했습니다.')
    }
  }

  if (isLoading) {
    return <div>데이터 로딩중입니다...</div>
  }
  return (
    <>
      <UserContext.Provider value={{ user, setUser }}>
        <DiaryStateContext.Provider value={{data}}>
          <DiaryDispatchContext.Provider value={{onCreate, onUpdate, onDelete}}>
            <Routes>
              <Route path='/login' element={<Login />} />
              <Route path='/Register' element={<Register />} />

              <Route path='/' element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path='/new' element={<ProtectedRoute><New /></ProtectedRoute>} />
              <Route path='/diary/:id' element={<ProtectedRoute><Diary /></ProtectedRoute>} />
              <Route path='/Edit/:id' element={<ProtectedRoute><Edit /></ProtectedRoute>} />
              <Route path='*' element={<Notfound />} />
            </Routes>
          </DiaryDispatchContext.Provider>
        </DiaryStateContext.Provider>
      </UserContext.Provider>
    </>
  )
}

export default App