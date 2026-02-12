/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react'

const AppContext = createContext()

export const AppProvider = ({ children }) => {

  const [ ranch, setRanch ] = useState(null)
  const [ ranches, setRanches ] =useState([])
  const [ calves, setCalves ] = useState([])
  const [ selected, setSelected ] = useState({
    breed: "",
    seller: "",
    status: "",
    date: "",
    dateFrom: "",
    dateTo: "",
  })
  const [ showCreateNewRanchPopup, setShowCreateNewRanchPopup ] = useState(false)
  const [ theme, setTheme ] = useState("light")

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light")

    setTheme(initialTheme)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    localStorage.setItem("theme", theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  const value = {
    ranch,
    setRanch,
    ranches,
    setRanches,
    calves,
    setCalves,
    selected, 
    setSelected,
    showCreateNewRanchPopup,
    setShowCreateNewRanchPopup,
    theme,
    setTheme,
    toggleTheme
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider')
  }
  return context
}
