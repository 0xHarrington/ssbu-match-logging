import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    IconButton,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Add as AddIcon,
    Analytics as AnalyticsIcon,
    Person as PersonIcon,
    Map as MapIcon,
    Menu as MenuIcon,
} from '@mui/icons-material';

const Navigation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const navItems = [
        { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
        { path: '/match-log', label: 'Match Log', icon: <AddIcon /> },
        { path: '/analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
        { path: '/character-stats', label: 'Character Stats', icon: <PersonIcon /> },
        { path: '/stage-stats', label: 'Stage Stats', icon: <MapIcon /> },
    ];

    return (
        <AppBar position="static">
            <Toolbar>
                {isMobile && (
                    <IconButton
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    SSBU Match Logging
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {navItems.map((item) => (
                        <Button
                            key={item.path}
                            color="inherit"
                            startIcon={item.icon}
                            onClick={() => navigate(item.path)}
                            sx={{
                                minWidth: isMobile ? 'auto' : 120,
                                px: isMobile ? 1 : 2,
                                backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                            }}
                        >
                            {!isMobile && item.label}
                        </Button>
                    ))}
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navigation; 