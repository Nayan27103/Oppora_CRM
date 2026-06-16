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
  Tooltip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar
} from '@mui/material';
import { 
  Search, 
  UserPlus, 
  Building2, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  Layers,
  Globe,
  MapPin,
  Users,
  Eye
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

export default function FinderPage({ activeOrg, onNavigate }) {
  // Required spec states
  const [activeTab, setActiveTab] = useState('companies'); // companies | people | both
  const [companyResults, setCompanyResults] = useState([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [domain, setDomain] = useState(''); // shared between tabs
  const [searchStatus, setSearchStatus] = useState(null); // pending | running | done | failed
  const [queryId, setQueryId] = useState(null);
  const [importedCounts, setImportedCounts] = useState({ contacts: 0, companies: 0 });
  const [history, setHistory] = useState([]);
  const pollingRef = useRef(null);

  // Additional form fields states
  const [companiesIndustry, setCompaniesIndustry] = useState('');
  const [companiesLocation, setCompaniesLocation] = useState('');
  const [companiesKeywords, setCompaniesKeywords] = useState('');

  const [peopleJobTitle, setPeopleJobTitle] = useState('');
  const [peopleLocation, setPeopleLocation] = useState('');

  const [bothIndustry, setBothIndustry] = useState('');
  const [bothJobTitle, setBothJobTitle] = useState('');
  const [bothLocation, setBothLocation] = useState('');

  // Results & Org states
  const [peopleResults, setPeopleResults] = useState([]);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);

  // Re-run auto-submit refs
  const autoSubmitCompanyRef = useRef(false);
  const autoSubmitPeopleRef = useRef(false);
  const autoSubmitBothRef = useRef(false);

  // Feedback states
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successSnackbarOpen, setSuccessSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Load history & fallback organization on mount
  useEffect(() => {
    fetchHistory();
    fetchCurrentOrg();

    if (!document.getElementById('roboto-font-link')) {
      const link = document.createElement('link');
      link.id = 'roboto-font-link';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap';
      document.head.appendChild(link);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Polling logic triggered when queryId changes
  useEffect(() => {
    if (!queryId) return;

    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.getFinderStatus(queryId);
        if (res.success) {
          const status = res.data.status;
          setSearchStatus(status);
          setImportedCounts({
            contacts: res.data.contacts_imported || 0,
            companies: res.data.companies_imported || 0
          });

          if (status === 'done') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            
            // Notification
            setSnackbarMessage('Import complete!');
            setSuccessSnackbarOpen(true);

            // Fetch newly imported contacts from database
            fetchNewlyImportedContacts(domain);
            
            // Refresh history
            fetchHistory();
          } else if (status === 'failed') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setErrorMessage(res.data.error_message || 'Search failed. Please try again.');
            setSnackbarOpen(true);
            fetchHistory();
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
        setSearchStatus('failed');
        setErrorMessage(err.data?.message || 'Error checking search status.');
        setSnackbarOpen(true);
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [queryId]);

  // Re-run auto-submit trigger
  useEffect(() => {
    if (activeTab === 'companies' && autoSubmitCompanyRef.current) {
      autoSubmitCompanyRef.current = false;
      handleCompanySearchSubmit();
    }
    if (activeTab === 'people' && autoSubmitPeopleRef.current && domain) {
      autoSubmitPeopleRef.current = false;
      handlePeopleSearchSubmit();
    }
    if (activeTab === 'both' && autoSubmitBothRef.current && domain) {
      autoSubmitBothRef.current = false;
      handleBothSearchSubmit();
    }
  }, [activeTab, domain, companiesIndustry, companiesLocation, companiesKeywords, peopleJobTitle, peopleLocation, bothIndustry, bothJobTitle, bothLocation]);

  const fetchHistory = async () => {
    try {
      const res = await api.getFinderHistory();
      if (res.success) {
        setHistory(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const fetchCurrentOrg = async () => {
    try {
      const res = await api.getOrganizations();
      if (res.success && res.data && res.data.length > 0) {
        setCurrentOrgId(res.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching user organization:', err);
    }
  };

  const fetchNewlyImportedContacts = async (searchVal) => {
    try {
      const res = await api.getContacts(searchVal, 1, 50);
      if (res.success) {
        setPeopleResults(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch newly imported contacts:', err);
    }
  };

  // Submit company search
  const handleCompanySearchSubmit = async (e) => {
    if (e) e.preventDefault();
    setCompanyLoading(true);
    setCompanyResults([]);
    
    try {
      const res = await api.searchCompanies({
        industry: (companiesIndustry || '').trim(),
        location: (companiesLocation || '').trim(),
        keywords: (companiesKeywords || '').trim()
      });
      if (res.success) {
        setCompanyResults(Array.isArray(res.data) ? res.data : []);
        if (res.data && res.data.length > 0) {
          setSnackbarMessage('Companies found!');
          setSuccessSnackbarOpen(true);
        } else {
          setErrorMessage('No companies found. Try different keywords.');
          setSnackbarOpen(true);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.data?.message || 'Search failed. Please try again.');
      setSnackbarOpen(true);
    } finally {
      setCompanyLoading(false);
    }
  };

  // Submit people search
  const handlePeopleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!domain.trim()) return;

    setSearchStatus('pending');
    setQueryId(null);
    setPeopleResults([]);
    setImportedCounts({ contacts: 0, companies: 0 });

    try {
      const res = await api.startFinderSearch({
        domain: domain.trim(),
        job_title: (peopleJobTitle || '').trim(),
        location: (peopleLocation || '').trim(),
        search_type: 'people'
      });

      if (res.success && res.data?.query_id) {
        setQueryId(res.data.query_id);
      } else {
        throw new Error('Failed to retrieve search query ID');
      }
    } catch (err) {
      setSearchStatus('failed');
      setErrorMessage(err.data?.message || err.message || 'Search failed. Please try again.');
      setSnackbarOpen(true);
    }
  };

  // Submit both search
  const handleBothSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!domain.trim()) return;

    setSearchStatus('pending');
    setQueryId(null);
    setPeopleResults([]);
    setImportedCounts({ contacts: 0, companies: 0 });

    try {
      const res = await api.startFinderSearch({
        domain: domain.trim(),
        industry: (bothIndustry || '').trim(),
        job_title: (bothJobTitle || '').trim(),
        location: (bothLocation || '').trim(),
        search_type: 'both'
      });

      if (res.success && res.data?.query_id) {
        setQueryId(res.data.query_id);
      } else {
        throw new Error('Failed to retrieve search query ID');
      }
    } catch (err) {
      setSearchStatus('failed');
      setErrorMessage(err.data?.message || err.message || 'Search failed. Please try again.');
      setSnackbarOpen(true);
    }
  };

  // Action: Add company to CRM
  const handleAddCompanyToCRM = async (company) => {
    if (!activeOrg) {
      setErrorMessage('Please select or create an active workspace first.');
      setSnackbarOpen(true);
      return;
    }

    try {
      const contactRes = await api.createContact({
        first_name: company.name,
        last_name: 'Company Account',
        email: `info@${company.domain}`,
        phone: '',
        company: company.name,
        job_title: 'Company Profile',
        organization: activeOrg.id
      });

      if (contactRes.success && contactRes.data?.id) {
        const leadRes = await api.createLead({
          contact: contactRes.data.id,
          status: 'NEW',
          notes: `Imported company from finder: ${company.description || ''}`,
          score: 0
        });

        if (leadRes.success) {
          setCompanyResults(prev => prev.map(c => c.domain === company.domain ? { ...c, imported: true } : c));
          setSnackbarMessage(`"${company.name}" added as a Lead inside "${activeOrg.name}"!`);
          setSuccessSnackbarOpen(true);
          window.dispatchEvent(new CustomEvent('lead_created'));
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.data?.message || 'Failed to add company to CRM.');
      setSnackbarOpen(true);
    }
  };

  // Action: Switch to People tab, autofill and trigger search immediately
  const handleFindPeople = (companyDomain) => {
    setDomain(companyDomain);
    setActiveTab('people');
    autoSubmitPeopleRef.current = true;
  };

  // Action: Re-run search from history
  const handleReRun = (item) => {
    if (item.search_type === 'company') {
      setCompaniesIndustry(item.industry || '');
      setCompaniesLocation(item.location || '');
      setCompaniesKeywords(item.domain || ''); // Keywords fallback
      setActiveTab('companies');
      autoSubmitCompanyRef.current = true;
    } else if (item.search_type === 'people') {
      setDomain(item.domain || '');
      setPeopleJobTitle(item.job_title || '');
      setPeopleLocation(item.location || '');
      setActiveTab('people');
      autoSubmitPeopleRef.current = true;
    } else if (item.search_type === 'both') {
      setDomain(item.domain || '');
      setBothIndustry(item.industry || '');
      setBothJobTitle(item.job_title || '');
      setBothLocation(item.location || '');
      setActiveTab('both');
      autoSubmitBothRef.current = true;
    }
  };

  // Helper: Get avatar initials
  const getInitials = (contact) => {
    if (!contact) return 'C';
    const first = contact.first_name ? contact.first_name[0] : '';
    const last = contact.last_name ? contact.last_name[0] : '';
    return (first + last).toUpperCase() || 'C';
  };

  // Helper: Deterministic Company details for Both mode
  const getCompanyDetailsForBoth = () => {
    const safeDomain = domain || '';
    const cleanDomain = safeDomain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] || 'company.com';
    const companyPrefix = cleanDomain.split('.')[0] || 'company';
    const capitalizedCompany = companyPrefix ? companyPrefix.charAt(0).toUpperCase() + companyPrefix.slice(1) : 'Company';
    return {
      name: `${capitalizedCompany} Inc.`,
      domain: cleanDomain,
      industry: bothIndustry || 'Technology',
      location: bothLocation || 'Remote / United States',
      employeeCount: '500 - 1,000 employees'
    };
  };

  // Helper: Safe date formatter to avoid runtime RangeError on invalid strings
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  // Helper: Format search type labels
  const formatSearchType = (type) => {
    if (!type) return 'N/A';
    switch (type) {
      case 'company': return 'Companies Only';
      case 'people': return 'People Only';
      case 'both': return 'Companies & People';
      default: return type;
    }
  };

  // Helpers for Status Chip Config
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
        return { label: status || 'Pending', color: 'default', variant: 'outlined' };
    }
  };

  // Helper to map status variables to strings
  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Queuing search...';
      case 'running': return 'Searching Hunter.io database...';
      case 'done': return 'Import complete!';
      case 'failed': return 'Search failed. Please try again.';
      default: return 'Starting lead finder...';
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
            Enrich your CRM database instantly. Search for companies to find their domain, or lookup emails and decision-makers.
          </Typography>
        </Box>

        {/* Tab switcher */}
        <Box sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => val && setActiveTab(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: '#D0BCFF',
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#D0BCFF',
                height: 3,
                borderRadius: '3px 3px 0 0',
              }
            }}
          >
            <Tab label="Companies" value="companies" />
            <Tab label="People" value="people" />
            <Tab label="Both" value="both" />
          </Tabs>
        </Box>

        {/* Tab content panels */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            
            {/* TAB 1 Form: Companies */}
            {activeTab === 'companies' && (
              <Card sx={{ backgroundColor: 'background.paper', borderRadius: '28px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: 2 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Typography variant="h6" color="text.primary">Search Companies</Typography>
                  <form onSubmit={handleCompanySearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 500 }}>Industry</Typography>
                      <TextField
                        fullWidth
                        placeholder="e.g. fintech, saas"
                        value={companiesIndustry}
                        onChange={(e) => setCompaniesIndustry(e.target.value)}
                        disabled={companyLoading}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 500 }}>Location</Typography>
                      <TextField
                        fullWidth
                        placeholder="e.g. San Francisco, India"
                        value={companiesLocation}
                        onChange={(e) => setCompaniesLocation(e.target.value)}
                        disabled={companyLoading}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 500 }}>Keywords</Typography>
                      <TextField
                        fullWidth
                        placeholder="e.g. payment startup, AI tools"
                        value={companiesKeywords}
                        onChange={(e) => setCompaniesKeywords(e.target.value)}
                        disabled={companyLoading}
                      />
                    </Box>
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      color="primary"
                      disabled={companyLoading}
                      startIcon={companyLoading ? <CircularProgress size={18} color="inherit" /> : <Search size={18} />}
                      sx={{ py: 1.5 }}
                    >
                      Search Companies
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* TAB 2 Form: People */}
            {activeTab === 'people' && (
              <Card sx={{ backgroundColor: 'background.paper', borderRadius: '28px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: 2 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Typography variant="h6" color="text.primary">Find People</Typography>
                  <form onSubmit={handlePeopleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 500 }}>Target Domain (Required)</Typography>
                      <TextField
                        fullWidth
                        required
                        placeholder="e.g. stripe.com"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        disabled={searchStatus === 'pending' || searchStatus === 'running'}
                        helperText="Provide company domain to search people"
                        FormHelperTextProps={{ sx: { color: 'text.secondary' } }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 500 }}>Job Title Filter (Optional)</Typography>
                      <TextField
                        fullWidth
                        placeholder="e.g. engineer, founder"
                        value={peopleJobTitle}
                        onChange={(e) => setPeopleJobTitle(e.target.value)}
                        disabled={searchStatus === 'pending' || searchStatus === 'running'}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 500 }}>Location Filter (Optional)</Typography>
                      <TextField
                        fullWidth
                        placeholder="e.g. London, San Francisco"
                        value={peopleLocation}
                        onChange={(e) => setPeopleLocation(e.target.value)}
                        disabled={searchStatus === 'pending' || searchStatus === 'running'}
                      />
                    </Box>
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      color="primary"
                      disabled={!domain.trim() || searchStatus === 'pending' || searchStatus === 'running'}
                      startIcon={(searchStatus === 'pending' || searchStatus === 'running') ? <CircularProgress size={18} color="inherit" /> : <Search size={18} />}
                      sx={{ py: 1.5 }}
                    >
                      Find People
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* TAB 3 Form: Both */}
            {activeTab === 'both' && (
              <Card sx={{ backgroundColor: 'background.paper', borderRadius: '28px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: 2 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Typography variant="h6" color="text.primary">Search Everything</Typography>
                  <form onSubmit={handleBothSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 500 }}>Target Domain (Required)</Typography>
                      <TextField
                        fullWidth
                        required
                        placeholder="e.g. stripe.com"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        disabled={searchStatus === 'pending' || searchStatus === 'running'}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 500 }}>Industry (Optional)</Typography>
                      <TextField
                        fullWidth
                        placeholder="e.g. fintech, ecommerce"
                        value={bothIndustry}
                        onChange={(e) => setBothIndustry(e.target.value)}
                        disabled={searchStatus === 'pending' || searchStatus === 'running'}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 500 }}>Job Title (Optional)</Typography>
                      <TextField
                        fullWidth
                        placeholder="e.g. developer, founder"
                        value={bothJobTitle}
                        onChange={(e) => setBothJobTitle(e.target.value)}
                        disabled={searchStatus === 'pending' || searchStatus === 'running'}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 500 }}>Location (Optional)</Typography>
                      <TextField
                        fullWidth
                        placeholder="e.g. India, Boston"
                        value={bothLocation}
                        onChange={(e) => setBothLocation(e.target.value)}
                        disabled={searchStatus === 'pending' || searchStatus === 'running'}
                      />
                    </Box>
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      color="primary"
                      disabled={!domain.trim() || searchStatus === 'pending' || searchStatus === 'running'}
                      startIcon={(searchStatus === 'pending' || searchStatus === 'running') ? <CircularProgress size={18} color="inherit" /> : <Search size={18} />}
                      sx={{ py: 1.5 }}
                    >
                      Search Everything
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

          </Grid>

          {/* Right Column: Dynamic Loader / Results Panel */}
          <Grid item xs={12} md={8}>
            
            {/* Welcoming state */}
            {activeTab === 'companies' && companyResults.length === 0 && !companyLoading && (
              <Card sx={{ height: '100%', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 4, textAlign: 'center', gap: 2 }}>
                <Building2 size={48} style={{ color: '#D0BCFF', opacity: 0.8 }} />
                <Typography variant="h6">Discover Target Companies</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '400px' }}>
                  Enter an industry, location, or keywords on the left to query matching companies and extract their domains.
                </Typography>
              </Card>
            )}

            {(activeTab === 'people' || activeTab === 'both') && !searchStatus && (
              <Card sx={{ height: '100%', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 4, textAlign: 'center', gap: 2 }}>
                <Users size={48} style={{ color: '#D0BCFF', opacity: 0.8 }} />
                <Typography variant="h6">Look Up Contacts</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '400px' }}>
                  Provide a domain and filter criteria to crawl decision-makers and import them as contacts automatically.
                </Typography>
              </Card>
            )}

            {/* Loading / Polling Progress bar */}
            {(companyLoading || searchStatus === 'pending' || searchStatus === 'running') && (
              <Card sx={{ height: '100%', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 4, gap: 3 }}>
                <CircularProgress size={48} thickness={4} color="primary" />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle1" fontWeight="600" color="text.primary">
                    {companyLoading ? 'Searching companies...' : getStatusText(searchStatus)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {companyLoading ? 'Querying DuckDuckGo scraper...' : 'Scanning databases and Hunter.io records...'}
                  </Typography>
                </Box>
                <Box sx={{ width: '100%', maxWidth: '360px' }}>
                  <LinearProgress color="primary" sx={{ height: 6, borderRadius: 3 }} />
                </Box>
              </Card>
            )}

            {/* Error States */}
            {searchStatus === 'failed' && (
              <Card sx={{ height: '100%', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 4, textAlign: 'center', gap: 2 }}>
                <AlertCircle size={48} style={{ color: '#F2B8B5' }} />
                <Typography variant="h6">Search failed. Please try again.</Typography>
                <Typography variant="body2" color="text.secondary">
                  {errorMessage || 'The background search process encountered an error.'}
                </Typography>
                <Button variant="outlined" color="primary" size="small" onClick={() => setSearchStatus(null)}>
                  Dismiss
                </Button>
              </Card>
            )}

            {/* TAB 1 Results: Companies Grid */}
            {activeTab === 'companies' && companyResults.length > 0 && !companyLoading && (
              <Grid container spacing={2}>
                {companyResults.map((company, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card sx={{
                      backgroundColor: 'background.paper',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: 2,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 2
                    }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="700" color="text.primary">
                          {company.name}
                        </Typography>
                        <Typography variant="caption" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                          <Globe size={12} /> {company.domain}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            display: '-webkit-box', 
                            WebkitLineClamp: 2, 
                            WebkitBoxOrient: 'vertical', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            fontSize: '0.8rem',
                            mb: 2
                          }}
                        >
                          {company.description || 'No description available for this result.'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {company.industry && (
                            <Chip label={company.industry} size="small" variant="outlined" sx={{ borderRadius: '6px', fontSize: '0.7rem' }} />
                          )}
                          {company.location && (
                            <Chip label={company.location} size="small" variant="outlined" sx={{ borderRadius: '6px', fontSize: '0.7rem' }} />
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          variant="contained" 
                          size="small" 
                          fullWidth 
                          disabled={company.imported}
                          onClick={() => handleAddCompanyToCRM(company)}
                          sx={{ fontSize: '0.75rem', py: 0.75, borderRadius: '8px' }}
                        >
                          {company.imported ? 'Added' : 'Add to CRM'}
                        </Button>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          fullWidth 
                          onClick={() => handleFindPeople(company.domain)}
                          sx={{ fontSize: '0.75rem', py: 0.75, borderRadius: '8px' }}
                        >
                          Find People
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* TAB 2 Results: People Table */}
            {activeTab === 'people' && searchStatus === 'done' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip
                    label={`${importedCounts.contacts} contacts imported`}
                    color="success"
                    size="medium"
                    sx={{ fontWeight: 600, borderRadius: '8px' }}
                  />
                </Box>
                <TableContainer component={Paper} sx={{ backgroundColor: 'background.paper', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Avatar</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Name</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Email</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Job Title</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Company</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600, textAlign: 'center' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {peopleResults.length > 0 ? (
                        peopleResults.map((person) => (
                          <TableRow key={person.id} sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <TableCell sx={{ borderBottom: 'none' }}>
                              <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', backgroundColor: '#381E72', color: '#D0BCFF', fontWeight: 600 }}>
                                {getInitials(person)}
                              </Avatar>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 500, borderBottom: 'none' }}>
                              {person.first_name} {person.last_name}
                            </TableCell>
                            <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>{person.email}</TableCell>
                            <TableCell sx={{ borderBottom: 'none' }}>{person.job_title}</TableCell>
                            <TableCell sx={{ borderBottom: 'none' }}>{person.company}</TableCell>
                            <TableCell sx={{ borderBottom: 'none', textAlign: 'center' }}>
                              <IconButton color="primary" onClick={() => setSelectedContact(person)} sx={{ '&:hover': { backgroundColor: 'rgba(208, 188, 255, 0.12)' } }}>
                                <Eye size={16} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                            No people found at this domain.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* TAB 3 Results: Both Info (Company Card + People Table) */}
            {activeTab === 'both' && searchStatus === 'done' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Chip
                    label={`${importedCounts.contacts} contacts + ${importedCounts.companies} companies imported`}
                    color="success"
                    size="medium"
                    sx={{ fontWeight: 600, borderRadius: '8px' }}
                  />
                </Box>
                
                {/* Company Info section */}
                <Card sx={{
                  backgroundColor: 'background.paper',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: 3
                }}>
                  {(() => {
                    const company = getCompanyDetailsForBoth();
                    return (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ width: 44, height: 44, borderRadius: '10px', backgroundColor: 'rgba(208, 188, 255, 0.12)', display: 'flex', alignItems: 'center', justify: 'center', color: '#D0BCFF', padding: '10px' }}>
                            <Building2 size={24} />
                          </Box>
                          <Box>
                            <Typography variant="subtitle1" fontWeight="700">{company.name}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Globe size={12} /> {company.domain}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                          <Chip label={company.industry} size="small" variant="outlined" />
                          <Chip label={company.location} size="small" variant="outlined" />
                          <Chip label={company.employeeCount} size="small" variant="outlined" />
                        </Box>
                      </Box>
                    );
                  })()}
                </Card>

                {/* People Table Section */}
                <TableContainer component={Paper} sx={{ backgroundColor: 'background.paper', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Avatar</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Name</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Email</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Job Title</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Company</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600, textAlign: 'center' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {peopleResults.length > 0 ? (
                        peopleResults.map((person) => (
                          <TableRow key={person.id} sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <TableCell sx={{ borderBottom: 'none' }}>
                              <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', backgroundColor: '#381E72', color: '#D0BCFF', fontWeight: 600 }}>
                                {getInitials(person)}
                              </Avatar>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 500, borderBottom: 'none' }}>
                              {person.first_name} {person.last_name}
                            </TableCell>
                            <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>{person.email}</TableCell>
                            <TableCell sx={{ borderBottom: 'none' }}>{person.job_title}</TableCell>
                            <TableCell sx={{ borderBottom: 'none' }}>{person.company}</TableCell>
                            <TableCell sx={{ borderBottom: 'none', textAlign: 'center' }}>
                              <IconButton color="primary" onClick={() => setSelectedContact(person)} sx={{ '&:hover': { backgroundColor: 'rgba(208, 188, 255, 0.12)' } }}>
                                <Eye size={16} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                            No people found at this domain.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

          </Grid>
        </Grid>

        {/* Recent Searches Section */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" color="text.primary" gutterBottom sx={{ mb: 2 }}>
            Recent Searches
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
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Domain / Search</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Mode</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Status</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>Contacts</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>Companies</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Date</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', width: '80px', textAlign: 'center' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((row) => {
                    const statusConfig = getStatusChipConfig(row.status);
                    return (
                      <TableRow 
                        key={row.id} 
                        sx={{ 
                          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                          transition: 'background-color 0.2s ease',
                          '&:hover': { 
                            backgroundColor: 'rgba(208, 188, 255, 0.04) !important'
                          } 
                        }}
                      >
                        <TableCell sx={{ fontWeight: 500, color: 'text.primary', borderBottom: 'none' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="body2" fontWeight="500">{row.domain || 'Keyword Criteria Search'}</Typography>
                            {(row.job_title || row.location || row.industry) && (
                              <Typography variant="caption" color="text.secondary">
                                {[
                                  row.job_title && `Title: ${row.job_title}`,
                                  row.industry && `Industry: ${row.industry}`,
                                  row.location && `Loc: ${row.location}`
                                ].filter(Boolean).join(' | ')}
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
                          {formatDate(row.created_at)}
                        </TableCell>
                        <TableCell sx={{ borderBottom: 'none', textAlign: 'center' }}>
                          <Tooltip title="Re-run Search">
                            <IconButton 
                              color="primary" 
                              onClick={() => handleReRun(row)}
                              disabled={companyLoading || searchStatus === 'pending' || searchStatus === 'running'}
                              sx={{ '&:hover': { backgroundColor: 'rgba(208, 188, 255, 0.15)' } }}
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
              <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, textAlign: 'center' }}>
                <Box sx={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', mb: 1 }}>
                  <Search size={32} />
                </Box>
                <Typography variant="subtitle1" fontWeight="600" color="text.primary">No searches yet</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '400px' }}>
                  No searches yet. Try searching above.
                </Typography>
              </Box>
            )}
          </TableContainer>
        </Box>

        {/* Detailed Contact View Dialog */}
        <Dialog open={!!selectedContact} onClose={() => setSelectedContact(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '24px', backgroundColor: '#121622', backgroundImage: 'none', border: '1px solid rgba(255, 255, 255, 0.08)' } }}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 3, pb: 1 }}>
            <Avatar sx={{ width: 48, height: 48, fontSize: '1.2rem', backgroundColor: '#381E72', color: '#D0BCFF', fontWeight: 600 }}>
              {selectedContact ? getInitials(selectedContact) : 'C'}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="700">
                {selectedContact?.first_name} {selectedContact?.last_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Discovered Lead Detail View
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', pb: 1.5 }}>
                <Typography variant="caption" color="text.secondary" display="block">Email Address</Typography>
                <Typography variant="body1" fontWeight="500">{selectedContact?.email || 'N/A'}</Typography>
              </Box>
              <Box sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', pb: 1.5 }}>
                <Typography variant="caption" color="text.secondary" display="block">Job Title</Typography>
                <Typography variant="body1" fontWeight="500">{selectedContact?.job_title || 'N/A'}</Typography>
              </Box>
              <Box sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', pb: 1.5 }}>
                <Typography variant="caption" color="text.secondary" display="block">Company</Typography>
                <Typography variant="body1" fontWeight="500">{selectedContact?.company || 'N/A'}</Typography>
              </Box>
              <Box sx={{ pb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" display="block">Date Added / Crawled</Typography>
                <Typography variant="body1" fontWeight="500">
                  {formatDate(selectedContact?.created_at)}
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setSelectedContact(null)} variant="contained" color="secondary" sx={{ borderRadius: '100px' }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success Alert Snackbar */}
        <Snackbar
          open={successSnackbarOpen}
          autoHideDuration={4000}
          onClose={() => setSuccessSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setSuccessSnackbarOpen(false)} 
            severity="success" 
            variant="filled"
            sx={{ width: '100%', borderRadius: '12px', boxShadow: 'none', backgroundColor: '#2e7d32' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>

        {/* Error Alert Snackbar */}
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
            sx={{ width: '100%', borderRadius: '12px', boxShadow: 'none' }}
          >
            {errorMessage}
          </Alert>
        </Snackbar>

      </Box>
    </ThemeProvider>
  );
}
