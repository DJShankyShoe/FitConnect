import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { url } from '../App.js';

export const Register = (props) => {
    const [companyID, setcompanyID] = useState('');
    const [pass, setPass] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loginError, setLoginError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const togglePasswordVisibility = () => {
        setShowPass(!showPass);
    };

    const handleLoginAccount = () => {
        navigate('/login');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true); // Set loading to true to display the loading spinner
        setLoginError(null); // Clear the error message when toggling visibility

        // Your API endpoint and data
        const apiUrl = url + '/company/login';
        const requestData = {
            companyID: companyID,
            pass: pass
        };

        try {
            // Make the API call using the fetch API
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(requestData)
            });

            // Check if the response is successful (status code 2xx)
            if (response.ok) {
                const jsonResponse = await response.json();
                props.setJWT(jsonResponse.token);
                navigate('/create');

            } else {
                const errorData = await response.json();
                setLoginError(errorData.message || 'Login failed');
            }
        } catch (error) {
            // Handle network or other errors
            console.error('Error during login:', error.message);
            setLoginError('Network error during login');
        } finally {
            // Set loading to false regardless of success or failure
            setLoading(false);
        }

    }

    return (
        <div className="auth-form-container">
            <h2>Register</h2>
            <form className="register-form" onSubmit={handleSubmit}>
                <label htmlFor="companyID">CompanyID</label>
                <input value={companyID} onChange={(e) => setcompanyID(e.target.value)} type="text" id="companyID" name="companyID" required/>
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
            <button className="link-btn" onClick={(handleLoginAccount)}>Already have an account? Login here.</button>
        </div>
    )
}