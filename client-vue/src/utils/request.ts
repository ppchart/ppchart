import axios from 'axios';

axios.defaults.headers['Content-Type'] = 'application/json;charset=utf-8';
const request = axios.create({
    baseURL: import.meta.env.VITE_APP_BASE_API,
    timeout: 10000
});


export default request;
