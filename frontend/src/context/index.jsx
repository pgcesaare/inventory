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
  const [hasManualTheme, setHasManualTheme] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const savedTheme = localStorage.getItem("theme")

    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme)
      setHasManualTheme(true)
    } else {
      setTheme(media.matches ? "dark" : "light")
      setHasManualTheme(false)
    }

    const applySystemTheme = () => {
      setTheme(media.matches ? "dark" : "light")
    }

    if (typeof media.addEventListener === "function") {
      const onChange = () => {
        if (!hasManualTheme) {
          applySystemTheme()
        }
      }
      media.addEventListener("change", onChange)
      return () => media.removeEventListener("change", onChange)
    }

    const onChange = () => {
      if (!hasManualTheme) {
        applySystemTheme()
      }
    }
    media.addListener(onChange)
    return () => media.removeListener(onChange)
  }, [hasManualTheme])

  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark"
      localStorage.setItem("theme", next)
      return next
    })
    setHasManualTheme(true)
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
