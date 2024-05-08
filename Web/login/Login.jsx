import React, { useState, useEffect } from "react";
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { url } from '../App.js';

export const Login = () => {
    const [userID, setuserID] = useState('');
    const [pass, setPass] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loginError, setLoginError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user has a session
        const token = Cookies.get('JWT');
        if (token) {
            navigate('/');
        }
    }, [navigate]);

    const togglePasswordVisibility = () => {
        setShowPass(!showPass);
    };

    const handleCreateAccount = () => {
        navigate('/register');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true); // Set loading to true to display the loading spinner
        setLoginError(null); // Clear the error message when toggling visibility

        // Your API endpoint and data
        const apiUrl = url + '/user/login';
        const requestData = {
            userID: userID,
            pass: pass
        };

        try {
            // Make the API call using the fetch API
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(requestData),
            });

            // Check if the response is successful (status code 2xx)
            if (response.ok) {
                const data = await response.json();
                const userType = jwtDecode(data.token)?.priv;

                // Cookie set to expire in 5 days. After getting https, set secure to true
                Cookies.set('JWT', data.token, { expires: 5, secure: false, sameSite: 'Strict' });
                
                if (userType === "User"){
                    navigate('/');
                } else if (userType === "Admin"){
                    navigate('/Admin');
                }

            } else {
                // Handle error responses, e.g., display an error message
                const errorData = await response.json();
                setLoginError(errorData.message || 'Login failed');
            }
        } catch (error) {
            // Handle network or other errors
            setLoginError('Network error during login');
        } finally {
            // Set loading to false regardless of success or failure
            setLoading(false);
        }
    };

    return (
        <div className="auth-form-container">
            <h2>Login</h2>
            <form className="login-form" onSubmit={handleSubmit}>
                <label htmlFor="userID">UserID</label>
                <input value={userID} onChange={(e) => setuserID(e.target.value)} type="text" id="userID" name="userID" required/>
                <label htmlFor="password">Password</label>
                <div className="input-container">
                    <input value={pass} onChange={(e) => setPass(e.target.value)} type={showPass ? 'text' : 'password'}  id="password" name="password" required/>
                    <span className="password-toggle" onClick={togglePasswordVisibility}>
                        {showPass ? (<FontAwesomeIcon icon={faEye} />) : (<FontAwesomeIcon icon={faEyeSlash} />)}
                    </span>
                </div>
                <button type="submit" disabled={loading} className={loading ? 'loading-button' : ''}>{loading ? 'Logging In...' : 'Log In'}</button>
            </form>
            {loginError && <p>{loginError}</p>}
            <button className="link-btn" onClick={handleCreateAccount}>Create Account</button>
        </div>
    )
}