import Cookies from 'js-cookie';
import { url } from './App.js';

export const checkAuthentication = async (token = Cookies.get('JWT')) => {
    if (!token) {
        return { authenticated: false, redirect: '/login' };
    }
    
    try {
        const response = await fetch(url + '/user/type', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();

        if (response.ok) {
            if (data.message === 'Valid: User' ) {
                return { authenticated: data.message, redirect: '/' };

            } else if (data.message === 'Valid: Trainer') {
                return { authenticated: data.message, redirect: '/' };

            } else if (data.message === 'Valid: Admin') {
                return { authenticated: data.message, redirect: '/admin' };

            } else if (data.message === 'Valid: Create User') {
                return { authenticated: data.message, redirect: '/Create' };

            } else if (data.message === 'Valid: Enrollment') {
                return { authenticated: data.message, redirect: '/Enrollment' };
                
            } else {
                Cookies.remove('JWT');
                return { authenticated: false, redirect: '/login' };
            };
        } else {
            Cookies.remove('JWT');
            if (data.message === 'Timeout Error') {
                return { authenticated: data.message, redirect: '/Login' };
            } else {
                return { authenticated: false, redirect: '/login' };
            };
        };
      } catch (error) {
            console.log('Error during authentication:', error.message);
            Cookies.remove('JWT');
            return { authenticated: false, redirect: '/login' };
      };
};
