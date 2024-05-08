import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import { Home } from './home/Home';
import { Admin } from './home/Admin';
import { Participant } from './home/Participant';
import { Overview } from './home/Overview';
import { Login } from './login/Login';
import { Register } from './login/Register';
import { Create } from './login/Create';
import { Enrollment } from './enrollment/Enrollment';
import { Response } from './enrollment/Response'; 
import { ErrorPage } from './error/404'; 
import './style/App.css';

export const url = 'http://192.168.10.132:3000';

function App() {
  const [JWT, setJWT] = useState(null);


  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/admin" element={<Admin/>} />
          <Route path="/participant" element={<Participant/>} />
          <Route path="/overview" element={<Overview/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/register" element={<Register setJWT={setJWT} />} />
          <Route path="/create" element={<Create JWT={JWT} setJWT={setJWT}/>} />
          <Route path="/enrollment/:param1" element={<Enrollment/>} />
          <Route path="/response" element={<Response/>} />
          <Route path="*" element={<ErrorPage/>} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;