import React, { useState, useEffect } from 'react';
import {
    Container,
    Grid,
    Paper,
    Typography,
    Box,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Divider,
} from '@mui/material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
} from 'recharts';
import axios from 'axios';

const Analytics = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uniqueStats, setUniqueStats] = useState(null);
    const [dailyStats, setDailyStats] = useState([]);
    const [characterStats, setCharacterStats] = useState([]);
    const [stageStats, setStageStats] = useState([]);
    const [playerStats, setPlayerStats] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [uniqueRes, dailyRes, charRes, stageRes, playerRes] = await Promise.all([
                    axios.get('/api/analytics/unique-stats'),
                    axios.get('/api/analytics/daily-stats'),
                    axios.get('/api/analytics/character-usage'),
                    axios.get('/api/analytics/stage-usage'),
                    axios.get('/api/analytics/player-stats')
                ]);

                setUniqueStats(uniqueRes.data);
                setDailyStats(dailyRes.data);
                setCharacterStats(charRes.data);
                setStageStats(stageRes.data);
                setPlayerStats(playerRes.data);
            } catch (err) {
                setError('Failed to fetch analytics data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Container>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                Analytics Dashboard
            </Typography>

            {/* Unique Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6">Unique Players</Typography>
                        <Typography variant="h4">{uniqueStats.unique_players}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6">Unique Characters</Typography>
                        <Typography variant="h4">{uniqueStats.unique_characters}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6">Unique Stages</Typography>
                        <Typography variant="h4">{uniqueStats.unique_stages}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6">Date Range</Typography>
                        <Typography variant="body2">
                            {new Date(uniqueStats.date_range.start).toLocaleDateString()} -{' '}
                            {new Date(uniqueStats.date_range.end).toLocaleDateString()}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Daily Trends Chart */}
            <Paper sx={{ p: 2, mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                    Daily Trends
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="matches" stroke="#8884d8" name="Matches" />
                        <Line type="monotone" dataKey="unique_characters_shayne" stroke="#82ca9d" name="Unique Characters (Shayne)" />
                        <Line type="monotone" dataKey="unique_characters_matt" stroke="#ffc658" name="Unique Characters (Matt)" />
                        <Line type="monotone" dataKey="unique_stages" stroke="#ff7300" name="Unique Stages" />
                    </LineChart>
                </ResponsiveContainer>
            </Paper>

            {/* Character Usage Chart */}
            <Paper sx={{ p: 2, mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                    Character Usage
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={characterStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="character" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total_usage" fill="#8884d8" name="Total Usage" />
                        <Bar dataKey="unique_players_shayne" fill="#82ca9d" name="Unique Players (Shayne)" />
                        <Bar dataKey="unique_players_matt" fill="#ffc658" name="Unique Players (Matt)" />
                    </BarChart>
                </ResponsiveContainer>
            </Paper>

            {/* Stage Usage Chart */}
            <Paper sx={{ p: 2, mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                    Stage Usage
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stageStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="stage" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total_usage" fill="#8884d8" name="Total Usage" />
                        <Bar dataKey="unique_characters_shayne" fill="#82ca9d" name="Unique Characters (Shayne)" />
                        <Bar dataKey="unique_characters_matt" fill="#ffc658" name="Unique Characters (Matt)" />
                    </BarChart>
                </ResponsiveContainer>
            </Paper>

            {/* Player Statistics */}
            <Grid container spacing={3}>
                {playerStats.map((player) => (
                    <Grid item xs={12} sm={6} key={player.player}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                {player.player}
                            </Typography>
                            <Typography>Total Matches: {player.total_matches}</Typography>
                            <Typography>Unique Characters: {player.unique_characters}</Typography>
                            <Typography>Unique Stages: {player.unique_stages}</Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
};

export default Analytics; 