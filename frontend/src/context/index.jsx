import React, { createContext, useState, useContext } from 'react'

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
    setShowCreateNewRanchPopup
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