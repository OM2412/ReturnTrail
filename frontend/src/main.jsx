import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { MotionConfig } from 'motion/react'
import App from './app/App'
import { CaseProvider } from './app/CaseContext'
import './styles/theme.css'
createRoot(document.getElementById('root')).render(
  <StrictMode><BrowserRouter><MotionConfig reducedMotion="user"><CaseProvider><App /></CaseProvider></MotionConfig></BrowserRouter></StrictMode>,
)
