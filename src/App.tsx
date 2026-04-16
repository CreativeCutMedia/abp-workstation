import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BuildsList from './views/BuildsList'
import Workstation from './views/Workstation'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BuildsList />} />
        <Route path="/build/:id" element={<Workstation />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
