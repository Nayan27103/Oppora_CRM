import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { 
  ThemeProvider, 
  createTheme, 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  ToggleButtonGroup, 
  ToggleButton, 
  Button, 
  LinearProgress, 
  CircularProgress,
  Chip, 
  Grid, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  IconButton, 
  Snackbar, 
  Alert,
  Tooltip
} from '@mui/material';
import { 
  Search, 
  UserPlus, 
  Building2, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  HelpCircle,
  Layers
} from 'lucide-react';

// MD3-inspired dark mode theme
const md3Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { 
      main: '#D0BCFF', // MD3 Dark Primary (purple tone)
      contrastText: '#381E72',
    },
    secondary: { 
      main: '#CCC2DC', // MD3 Dark Secondary
      contrastText: '#332D41',
    },
    error: { 
      main: '#F2B8B5', // MD3 Dark Error
    },
    background: {
      default: '#0a0d14', // Matches CRM base background
      paper: '#121622',   // Matches CRM surface background
    },
    text: {
      primary: '#E6E1E5',
      secondary: '#CAC4D0',
    },
  },
  shape: { 
    borderRadius: 12 
  },
  typography: {
    fontFamily: '"Roboto", "Plus Jakarta Sans", sans-serif',
    h1: { fontFamily: '"Outfit", sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Outfit", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Outfit", sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 100, // MD3 pills style for buttons
          textTransform: 'none',
          fontWeight: 500,
          padding: '10px 24px',
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          borderRadius: 100, // MD3 segmented buttons
          border: '1px solid rgba(204, 196, 206, 0.4)',
          overflow: 'hidden',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: 'none',
          textTransform: 'none',
          padding: '8px 24px',
          '&.Mui-selected': {
            backgroundColor: '#D0BCFF',
            color: '#381E72',
            '&:hover': {
              backgroundColor: '#E8DEF8',
            },
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '& fieldset': {
              borderColor: 'rgba(204, 196, 206, 0.4)',
            },
            '&:hover fieldset': {
              borderColor: '#D0BCFF',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#D0BCFF',
              borderWidth: 2,
            },
          },
        },
      },
    },
  },
});

export default function FinderPage({ onNavigate }) {
  // Page states
  const [domain, setDomain] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [searchType, setSearchType] = useState('both'); // company | people | both
  
  // State management
  const [searchState, setSearchState] = useState('idle'); // idle | submitting | polling | done | failed
  const [currentQueryId, setCurrentQueryId] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [history, setHistory] = useState([]);
  
  // Feedback states
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Ref for polling interval cleanup
  const pollIntervalRef = useRef(null);

  // Load history on mount
  useEffect(() => {
    fetchHistory();
    // Load Roboto font if it isn't loaded
    if (!document.getElementById('roboto-font-link')) {
      const link = document.createElement('link');
      link.id = 'roboto-font-link';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap';
      document.head.appendChild(link);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.getFinderHistory();
      if (res.success) {
        setHistory(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  // Poll status endpoint every 3 seconds
  const startPolling = (queryId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setSearchState('polling');
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await api.getFinderStatus(queryId);
        if (res.success) {
          const data = res.data;
          setStatusData(data);
          
          if (data.status === 'done') {
            setSearchState('done');
            clearInterval(pollIntervalRef.current);
            fetchHistory(); // Refresh history
          } else if (data.status === 'failed') {
            setSearchState('failed');
            setErrorMessage(data.error_message || 'The finder task failed on the server.');
            setSnackbarOpen(true);
            clearInterval(pollIntervalRef.current);
            fetchHistory(); // Refresh history
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
        setSearchState('failed');
        setErrorMessage(err.data?.message || 'Error occurred while checking search status.');
        setSnackbarOpen(true);
        clearInterval(pollIntervalRef.current);
      }
    }, 3000);
  };

  // Submit search query
  const handleFindLeads = async (e) => {
    if (e) e.preventDefault();
    if (!domain.trim()) return;

    setSearchState('submitting');
    setStatusData(null);
    
    const payload = {
      domain: domain.trim(),
      job_title: jobTitle.trim(),
      location: location.trim(),
      search_type: searchType
    };

    try {
      const res = await api.startFinderSearch(payload);
      if (res.success && res.data?.query_id) {
        const queryId = res.data.query_id;
        setCurrentQueryId(queryId);
        startPolling(queryId);
      } else {
        throw new Error('Could not retrieve search query ID');
      }
    } catch (err) {
      setSearchState('failed');
      setErrorMessage(err.data?.message || err.message || 'Failed to start lead finder search.');
      setSnackbarOpen(true);
    }
  };

  // Re-run handler from history row
  const handleReRun = (item) => {
    setDomain(item.domain || '');
    setJobTitle(item.job_title || '');
    setLocation(item.location || '');
    setSearchType(item.search_type || 'both');
    
    // Trigger submit right after setting state. Need to pass updated payload.
    setSearchState('submitting');
    setStatusData(null);
    
    const payload = {
      domain: item.domain || '',
      job_title: item.job_title || '',
      location: item.location || '',
      search_type: item.search_type || 'both'
    };

    api.startFinderSearch(payload)
      .then(res => {
        if (res.success && res.data?.query_id) {
          const queryId = res.data.query_id;
          setCurrentQueryId(queryId);
          startPolling(queryId);
        } else {
          throw new Error('Could not retrieve search query ID');
        }
      })
      .catch(err => {
        setSearchState('failed');
        setErrorMessage(err.data?.message || err.message || 'Failed to start lead finder search.');
        setSnackbarOpen(true);
      });
  };

  // Select a past search query to display results on the right
  const handleSelectHistoryRow = (row) => {
    setDomain(row.domain || '');
    setJobTitle(row.job_title || '');
    setLocation(row.location || '');
    setSearchType(row.search_type || 'both');
    
    setCurrentQueryId(row.id);
    setStatusData(row);
    
    if (row.status === 'done') {
      setSearchState('done');
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    } else if (row.status === 'failed') {
      setSearchState('failed');
      setErrorMessage(row.error_message || 'The finder task failed on the server.');
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    } else if (row.status === 'running' || row.status === 'pending') {
      startPolling(row.id);
    }
  };

  // Navigation handlers
  const navigateTo = (destination) => {
    // Fire event for global window listener in App.jsx
    window.dispatchEvent(new CustomEvent('navigate', { detail: destination }));
    // Call prop callback if provided
    if (onNavigate) {
      onNavigate(destination);
    }
  };

  // Helper to format search type labels
  const formatSearchType = (type) => {
    switch (type) {
      case 'company': return 'Companies Only';
      case 'people': return 'People Only';
      case 'both': return 'Companies & People';
      default: return type;
    }
  };

  // Helper to get chip colors
  const getStatusChipConfig = (status) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', color: 'warning', variant: 'outlined' };
      case 'running':
        return { label: 'Running', color: 'primary', variant: 'filled' };
      case 'done':
        return { label: 'Done', color: 'success', variant: 'filled' };
      case 'failed':
        return { label: 'Failed', color: 'error', variant: 'filled' };
      default:
        return { label: status, color: 'default', variant: 'outlined' };
    }
  };

  return (
    <ThemeProvider theme={md3Theme}>
      <Box sx={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        
        {/* Header */}
        <Box>
          <Typography variant="h4" color="text.primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Layers size={28} style={{ color: '#D0BCFF' }} /> Lead & Company Finder
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enrich your CRM database instantly. Provide a domain name to crawl and discover matching corporate records and decision-makers.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Left Column: Search Form */}
          <Grid item xs={12} md={7}>
            <Card sx={{ 
              backgroundColor: 'background.paper', 
              borderRadius: '28px', // MD3 extra-large shape
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: 'none',
              padding: 2
            }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography variant="h6" color="text.primary">
                  Search Criteria
                </Typography>
                
                <form onSubmit={handleFindLeads} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Domain input */}
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 500 }}>
                      Target Domain (Required)
                    </Typography>
                    <TextField
                      fullWidth
                      required
                      placeholder="e.g. stripe.com"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      disabled={searchState === 'submitting' || searchState === 'polling'}
                      helperText="Enter domain without https:// e.g. stripe.com"
                      FormHelperTextProps={{ sx: { color: 'text.secondary', mt: 0.5 } }}
                    />
                  </Box>

                  {/* Job Title input */}
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 500 }}>
                      Filter by Job Title (Optional)
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="e.g. engineer, founder"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      disabled={searchState === 'submitting' || searchState === 'polling'}
                      helperText="Target specific job designations"
                      FormHelperTextProps={{ sx: { color: 'text.secondary', mt: 0.5 } }}
                    />
                  </Box>

                  {/* Location input */}
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 500 }}>
                      Filter by Location (Optional)
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="e.g. San Francisco, London"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={searchState === 'submitting' || searchState === 'polling'}
                      helperText="Limit contacts to a specific city or region"
                      FormHelperTextProps={{ sx: { color: 'text.secondary', mt: 0.5 } }}
                    />
                  </Box>

                  {/* Search Type Toggle Buttons */}
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 500 }}>
                      Search Focus
                    </Typography>
                    <ToggleButtonGroup
                      value={searchType}
                      exclusive
                      onChange={(e, val) => val && setSearchType(val)}
                      disabled={searchState === 'submitting' || searchState === 'polling'}
                      fullWidth
                    >
                      <ToggleButton value="company">Companies</ToggleButton>
                      <ToggleButton value="people">People</ToggleButton>
                      <ToggleButton value="both">Both</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    color="primary"
                    disabled={!domain.trim() || searchState === 'submitting' || searchState === 'polling'}
                    startIcon={searchState === 'submitting' || searchState === 'polling' ? <CircularProgress size={18} color="inherit" /> : <Search size={18} />}
                    sx={{ mt: 1, py: 1.5, fontSize: '0.95rem' }}
                  >
                    Find Leads
                  </Button>
                </form>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column: Status Card & Results Summary */}
          <Grid item xs={12} md={5}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              
              {/* Live Status Card */}
              {searchState !== 'idle' && (
                <Card sx={{
                  backgroundColor: 'background.paper',
                  borderRadius: '16px', // MD3 large shape
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: 'none',
                  padding: 2,
                  animation: 'slideUp 300ms cubic-bezier(0.05, 0.7, 0.1, 1.0) forwards',
                  position: 'relative',
                  overflow: 'hidden',
                  '@keyframes slideUp': {
                    'from': { opacity: 0, transform: 'translateY(16px)' },
                    'to': { opacity: 1, transform: 'translateY(0)' }
                  }
                }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" fontWeight="600" color="text.primary">
                        Discovery Status
                      </Typography>
                      {/* Status Chip with Pulse animation for running state */}
                      {(() => {
                        const config = getStatusChipConfig(statusData?.status || 'pending');
                        const isRunning = statusData?.status === 'running' || searchState === 'submitting' || (searchState === 'polling' && statusData?.status !== 'done' && statusData?.status !== 'failed');
                        return (
                          <Chip
                            label={isRunning ? 'Running' : config.label}
                            color={isRunning ? 'primary' : config.color}
                            variant={config.variant}
                            sx={{
                              fontWeight: 600,
                              borderRadius: '8px',
                              ...(isRunning && {
                                animation: 'pulseOutline 2s infinite',
                                '@keyframes pulseOutline': {
                                  '0%': { boxShadow: '0 0 0 0 rgba(208, 188, 255, 0.5)' },
                                  '70%': { boxShadow: '0 0 0 6px rgba(208, 188, 255, 0)' },
                                  '100%': { boxShadow: '0 0 0 0 rgba(208, 188, 255, 0)' }
                                }
                              })
                            }}
                          />
                        );
                      })()}
                    </Box>

                    {/* Progress Indicator */}
                    {(searchState === 'submitting' || searchState === 'polling' || statusData?.status === 'pending' || statusData?.status === 'running') && (
                      <Box sx={{ width: '100%', my: 0.5 }}>
                        <LinearProgress color="primary" sx={{ height: 6, borderRadius: 3 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                          Crawling website pages, checking social links, and importing leads...
                        </Typography>
                      </Box>
                    )}

                    {/* Done State Details */}
                    {searchState === 'done' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                          <CheckCircle2 size={20} />
                          <Typography variant="body2" fontWeight="500">
                            Search crawl completed successfully!
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                          <Chip 
                            label={`${statusData?.contacts_imported || 0} Contacts Imported`} 
                            size="medium"
                            sx={{ 
                              backgroundColor: 'rgba(195, 231, 178, 0.15)', 
                              color: '#C3E7B2',
                              fontWeight: 500,
                              borderRadius: '8px'
                            }} 
                          />
                          <Chip 
                            label={`${statusData?.companies_imported || 0} Companies Imported`} 
                            size="medium"
                            sx={{ 
                              backgroundColor: 'rgba(208, 188, 255, 0.15)', 
                              color: '#D0BCFF',
                              fontWeight: 500,
                              borderRadius: '8px'
                            }} 
                          />
                        </Box>
                      </Box>
                    )}

                    {/* Failed State Details */}
                    {searchState === 'failed' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                          <AlertCircle size={20} />
                          <Typography variant="body2" fontWeight="500">
                            Discovery process aborted
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 1, backgroundColor: 'rgba(242, 184, 181, 0.08)', borderRadius: '8px', border: '1px solid rgba(242, 184, 181, 0.2)', wordBreak: 'break-word' }}>
                          {errorMessage}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Results Summary cards side-by-side (rendered when status is done) */}
              {searchState === 'done' && (
                <Grid container spacing={2} sx={{ animation: 'fadeIn 300ms ease-out' }}>
                  {/* Contacts Imported Stat */}
                  <Grid item xs={6}>
                    <Card sx={{
                      backgroundColor: 'rgba(208, 188, 255, 0.08)', // MD3 surface container highest
                      borderRadius: '16px',
                      border: '1px solid rgba(208, 188, 255, 0.15)',
                      boxShadow: 'none',
                      height: '100%',
                      textAlign: 'center',
                      p: 2
                    }}>
                      <CardContent sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ p: 1, borderRadius: '50%', backgroundColor: 'rgba(208, 188, 255, 0.15)', color: '#D0BCFF' }}>
                          <UserPlus size={24} />
                        </Box>
                        <Typography variant="h3" color="text.primary" sx={{ fontWeight: 700, my: 1 }}>
                          {statusData?.contacts_imported || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                          Contacts Imported
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          fullWidth
                          color="primary"
                          onClick={() => navigateTo('contacts')}
                          sx={{ py: 0.75, borderRadius: '8px' }}
                        >
                          View Contacts
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Companies Imported Stat */}
                  <Grid item xs={6}>
                    <Card sx={{
                      backgroundColor: 'rgba(204, 196, 206, 0.08)', // MD3 surface container highest
                      borderRadius: '16px',
                      border: '1px solid rgba(204, 196, 206, 0.15)',
                      boxShadow: 'none',
                      height: '100%',
                      textAlign: 'center',
                      p: 2
                    }}>
                      <CardContent sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ p: 1, borderRadius: '50%', backgroundColor: 'rgba(204, 196, 206, 0.15)', color: '#CCC2DC' }}>
                          <Building2 size={24} />
                        </Box>
                        <Typography variant="h3" color="text.primary" sx={{ fontWeight: 700, my: 1 }}>
                          {statusData?.companies_imported || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                          Companies Imported
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          fullWidth
                          color="secondary"
                          onClick={() => navigateTo('organizations')}
                          sx={{ py: 0.75, borderRadius: '8px', color: '#CCC2DC', borderColor: 'rgba(204, 196, 206, 0.4)' }}
                        >
                          View Companies
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* Search History Section */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" color="text.primary" gutterBottom sx={{ mb: 2 }}>
            Search History
          </Typography>

          <TableContainer component={Paper} sx={{
            backgroundColor: 'background.paper',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: 'none',
            overflow: 'hidden'
          }}>
            {history.length > 0 ? (
              <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Domain</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Type</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Status</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>Contacts</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>Companies</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Date</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', width: '80px', textAlign: 'center' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((row) => {
                    const statusConfig = getStatusChipConfig(row.status);
                    return (
                      <TableRow 
                        key={row.id} 
                        onClick={() => handleSelectHistoryRow(row)}
                        sx={{ 
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                          transition: 'background-color 0.2s ease',
                          '&:hover': { 
                            backgroundColor: 'rgba(208, 188, 255, 0.08) !important' // MD3 State layer: 8% primary on hover
                          } 
                        }}
                      >
                        <TableCell sx={{ fontWeight: 500, color: 'text.primary', borderBottom: 'none' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="body2" fontWeight="500">{row.domain}</Typography>
                            {row.job_title && (
                              <Typography variant="caption" color="text.secondary">
                                Title: {row.job_title} {row.location && `| Loc: ${row.location}`}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>{formatSearchType(row.search_type)}</TableCell>
                        <TableCell sx={{ borderBottom: 'none' }}>
                          <Chip 
                            label={statusConfig.label} 
                            color={statusConfig.color} 
                            size="small" 
                            variant={statusConfig.variant}
                            sx={{ fontWeight: 600, borderRadius: '6px' }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 600, textAlign: 'center', borderBottom: 'none' }}>{row.contacts_imported}</TableCell>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 600, textAlign: 'center', borderBottom: 'none' }}>{row.companies_imported}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>
                          {new Date(row.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell sx={{ borderBottom: 'none', textAlign: 'center' }}>
                          <Tooltip title="Re-run Search">
                            <IconButton 
                              color="primary" 
                              onClick={(e) => { e.stopPropagation(); handleReRun(row); }}
                              disabled={searchState === 'submitting' || searchState === 'polling'}
                              sx={{ 
                                '&:hover': { backgroundColor: 'rgba(208, 188, 255, 0.15)' }
                              }}
                            >
                              <RotateCw size={16} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              // Empty State Illustration Placeholder
              <Box sx={{ 
                p: 6, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 2,
                textAlign: 'center'
              }}>
                <Box sx={{ 
                  width: 64, 
                  height: 64, 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'text.secondary',
                  mb: 1
                }}>
                  <Search size={32} />
                </Box>
                <Typography variant="subtitle1" fontWeight="600" color="text.primary">
                  No searches yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '400px' }}>
                  Try searching for a company domain above to find high-quality leads, contacts, and organization details instantly.
                </Typography>
              </Box>
            )}
          </TableContainer>
        </Box>

        {/* MD3 error alert Snackbar */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setSnackbarOpen(false)} 
            severity="error" 
            variant="filled"
            action={
              <Button color="inherit" size="small" onClick={() => { setSnackbarOpen(false); handleFindLeads(); }}>
                Retry
              </Button>
            }
            sx={{ width: '100%', borderRadius: '12px', boxShadow: 'none' }}
          >
            {errorMessage}
          </Alert>
        </Snackbar>

      </Box>
    </ThemeProvider>
  );
}
