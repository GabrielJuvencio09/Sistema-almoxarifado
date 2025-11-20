import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({children}){
    const {isAuthenticated, isLoading} = useAuth()

    if(isLoading){
        return <div>Carregando sua Sessao...</div>
    }
    if(!isAuthenticated){
        return <Navigate to="/login" replace/>
    }
    return children
}