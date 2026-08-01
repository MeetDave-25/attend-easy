import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { authAPI } from "@/lib/api";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'teacher' | 'student';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const user = authAPI.getCurrentUser();

            if (!token || !user) {
                setIsAuthenticated(false);
                return;
            }

            setIsAuthenticated(true);
            setUserRole(user.role);
        };

        checkAuth();
    }, []);

    // Loading state
    if (isAuthenticated === null) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // Not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check role if required
    if (requiredRole && userRole !== requiredRole) {
        // Redirect to appropriate dashboard
        if (userRole === 'teacher') {
            return <Navigate to="/" replace />;
        } else if (userRole === 'student') {
            return <Navigate to="/student" replace />;
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
