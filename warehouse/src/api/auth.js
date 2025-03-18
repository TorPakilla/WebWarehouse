import axios from 'axios';

const API_URL = 'http://localhost:5050';

export const login = async (credentials) => {
    try {
        const response = await axios.post(`${API_URL}/login`, credentials);

        if (response.data.token && response.data.user) {
            localStorage.setItem('token', response.data.token); // ✅ Store Token
            localStorage.setItem('user', JSON.stringify(response.data.user)); // ✅ Store User Data
        } else {
            console.warn("⚠️ No user data received from API");
        }
        return response.data;
    } catch (error) {
        console.error('Login failed:', error);
        throw error;
    }
};
