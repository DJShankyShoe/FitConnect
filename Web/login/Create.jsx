import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAuthentication } from '../authenticate';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { url } from '../App.js';

export const Create = (props) => {
    const [userID, setuserID] = useState('');
    const [pass1, setPass1] = useState('');
    const [pass2, setPass2] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loginError, setLoginError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAndRedirect = async () => {
            const { authenticated, redirect } = await checkAuthentication(props.JWT);

            if (props.JWT === null) {
                navigate('/register');

            } else if (authenticated === "Timeout Error") {
                setLoading(true);
                setShowErrorModal(true);

                // Use setTimeout for redirection
                const timeoutId = setTimeout(() => {navigate('/register'); props.setJWT(null);}, 3000);
                return () => clearTimeout(timeoutId); // Clean up the timeout to avoid memory leaks

            } else if (authenticated !== 'Valid: Create User') {
                navigate(redirect);
                return null;
            } 
        };
        checkAndRedirect();

    }, [loginError, navigate, props]);

    if (props.JWT === null){
        return null;
    }

    const togglePasswordVisibility = () => {
        setShowPass(!showPass);
    };
    
    const arePasswordsEqual = pass1 === pass2;

    // Error Pop-up
    const ErrorModal = ({ message }) => {
        return (
          <div className="error-modal">
            <div className="modal-content">
              <p>{message}</p>
            </div>
          </div>
        );
    };

    // Prevent the website from reloading
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        setLoading(true); // Set loading to true to display the loading spinner
        setLoginError(null); // Clear the error message when toggling visibility

        // Check if passwords match
        if (!arePasswordsEqual) {
            setLoginError("Passwords do not match.");
            setLoading(false)
            return;
        }

        // Your API endpoint and data
        const apiUrl = url + '/user/create';
        const requestData = {
            userID: userID,
            pass: pass1
        };

        try {
            // Make the API call using the fetch API
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${props.JWT}`,
                  },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            // Check if the response is successful (status code 2xx)
            if (response.ok) {
                setLoading(true);
                setLoginError('Account Created. Redirecting...');
                setTimeout(() => {navigate('/login');}, 2000);

            } else if (data.message === "Timeout Error") {
                setShowErrorModal(true);
                setLoginError(data.message);

            } else {
                setLoginError(data.message);

            }
        } catch (error) {
            // Handle network or other errors
            setLoginError('Network error during account creation');
        } finally {
            // Set loading to false regardless of success or failure
            setLoading(false);
        }
    }

    return (
        <div className="auth-form-container">
            <h2>Create Account</h2>
            <form className="create-form" onSubmit={handleSubmit}>
                <label htmlFor="userID">New UserID</label>
                <input value={userID} onChange={(e) => setuserID(e.target.value)} type="text" id="userID" name="userID" required/>
                
                <label htmlFor="password1">Password</label>
                <div className="input-container">
                    <input value={pass1} onChange={(e) => setPass1(e.target.value)} type={showPass ? 'text' : 'password'}  id="password1" name="password1" required/>
                    <span className="password-toggle" onClick={togglePasswordVisibility}>
                        {showPass ? (<FontAwesomeIcon icon={faEye} />) : (<FontAwesomeIcon icon={faEyeSlash} />)}
                    </span>
                </div>

                <label htmlFor="password2">Confirm Password</label>
                <div className="input-container">
                    <input value={pass2} onChange={(e) => setPass2(e.target.value)} type={showPass ? 'text' : 'password'}  id="password2" name="password2" required/>
                    <span className="password-toggle" onClick={togglePasswordVisibility}>
                        {showPass ? (<FontAwesomeIcon icon={faEye} />) : (<FontAwesomeIcon icon={faEyeSlash} />)}
                    </span>
                </div>
                <button type="submit" disabled={loading || !arePasswordsEqual} className={loading || !arePasswordsEqual ? 'loading-button' : ''}>{loading ? 'Creating Account...' : 'Create Account'}</button>
                {!arePasswordsEqual && <p>Passwords do not match.</p>}
            </form>
            {loginError && loginError.includes("Password complexity not met") ? (<p className="password-complex-error-message">{loginError}</p>) : (<p>{loginError}</p>)}
            {showErrorModal && <ErrorModal message="Timeout Error. Redirecting..." />}
        </div>
    )
}