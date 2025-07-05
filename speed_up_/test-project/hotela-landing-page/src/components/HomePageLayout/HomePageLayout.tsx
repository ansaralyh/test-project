import React from 'react'
import Navbar from '../Navbar/Navbar'
import { Outlet } from 'react-router-dom'
import Footer from '../Footer/Footer'

function HomePageLayout() {
  return (
    <div>
        <Navbar/>
        <div>
            <Outlet/>
        </div>
        <Footer/>
    </div>
  )
}

export default HomePageLayout