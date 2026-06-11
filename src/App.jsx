import './App.css'
import 'react-base-components/styles.css'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider } from './context/auth-context'
import { OpenApiProvider } from './context/openapi-context'
import UserRouters from './containers/app-shell'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';


function App() {
  return (
    <Router>
      <AuthProvider>
        <OpenApiProvider>
          <ToastContainer theme="dark" position="top-right" />
          <Routes>
            <Route path="/*" element={<UserRouters />} />
          </Routes>
        </OpenApiProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
