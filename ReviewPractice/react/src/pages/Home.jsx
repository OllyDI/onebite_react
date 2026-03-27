import { useState, useContext } from 'react'
import { DiaryStateContext } from '../App'
import { UserContext } from '../util/UserContext'
import Header from '../components/Header'
import Button from '../components/Button'
import DiaryList from '../components/DiaryList'
import usePageTitle from '../hooks/usePageTitle'

const getMonthlyData = (pivotDate, data) => {
    const beginTime = new Date(pivotDate.getFullYear(), pivotDate.getMonth(), 1, 0, 0, 0).getTime();
    const EndTime = new Date(pivotDate.getFullYear(), pivotDate.getMonth() + 1, 0, 23, 59, 59).getTime();
    return data.filter((item) => beginTime <= item.createdDate && item.createdDate <= EndTime);
}

const Home = () => {
    
    const { data } = useContext(DiaryStateContext);
    const { user } = useContext(UserContext);
    const [pivotDate, setPrivotDate] = useState(new Date());
    const monthlyData = getMonthlyData(pivotDate, data);

    usePageTitle('감정 일기장');

    const onIncreaseMonth = () => {
        setPrivotDate(new Date(pivotDate.getFullYear(), pivotDate.getMonth() + 1));
    }
    const onDecreaseMonth = () => {
        setPrivotDate(new Date(pivotDate.getFullYear(), pivotDate.getMonth() - 1));
    }

    return (
        <div>
            <Header 
                title={`${user?.name}님의 ${pivotDate.getFullYear()}년 ${pivotDate.getMonth() + 1}월`} 
                leftChild={<Button onClick={onDecreaseMonth} text={'<'}/>}
                rightChild={<Button onClick={onIncreaseMonth} text={'>'}/>}
            >
            </Header>
            <DiaryList data={monthlyData}/>
        </div>
    )
}

export default Home