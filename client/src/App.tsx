import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  Flex,
  HStack,
  Text,
  useToast,
  IconButton,
  useColorMode,
  useColorModeValue,
  Grid,
  GridItem,
  Icon,
  Tabs,
  TabList,
  Tab,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { FiPrinter, FiActivity, FiBell, FiSettings, FiGitBranch, FiCode } from 'react-icons/fi';
import { api, PrinterStatus, Statistics, useSSE } from './api';
import StatusPanel from './components/StatusPanel';
import InkLevels from './components/InkLevels';
import PaperTray from './components/PaperTray';
import PrintQueue from './components/PrintQueue';
import ControlPanel from './components/ControlPanel';
import PrintForm from './components/PrintForm';
import StatsPanel from './components/StatsPanel';
import EventLog from './components/EventLog';
import Sidebar from './components/Sidebar';
import TemplateEditor from './components/TemplateEditor';
import Settings from './components/Settings';

function App() {
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | undefined>(undefined);
  const [currentLocationId, setCurrentLocationId] = useState<string>('loc-home'); // Default to Home
  const toast = useToast();
  const { colorMode, toggleColorMode } = useColorMode();
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();

  // Use ref to track selected printer ID for polling (avoids stale closure)
  const selectedPrinterIdRef = useRef<string | undefined>(undefined);
  // Track if SSE should be disabled
  const sseDisabledRef = useRef(false);

  // GitHub-style colors
  const headerBg = useColorModeValue('canvasLight.default', 'canvas.subtle');
  const borderColor = useColorModeValue('borderLight.default', 'border.default');
  const canvasBg = useColorModeValue('canvasLight.subtle', 'canvas.default');
  const mutedText = useColorModeValue('fgLight.muted', 'fg.muted');

  // Show toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    toast({
      title: message,
      status: type,
      duration: 3000,
      isClosable: true,
      position: 'top',
    });
  }, [toast]);

  // Handle location selection from sidebar
  const handleSelectLocation = useCallback((locationId: string) => {
    console.log('[App] Selecting location:', locationId);
    setCurrentLocationId(locationId);
    showToast(`Location set to ${locationId === 'loc-home' ? 'Home' : 'Office'}`, 'info');
  }, [showToast]);

  // Handle printer selection from sidebar (just for viewing, doesn't change location)
  const handleSelectPrinter = useCallback(async (printerId: string) => {
    console.log('[App] Selecting printer:', printerId);

    // Update both state and ref immediately
    setSelectedPrinterId(printerId);
    selectedPrinterIdRef.current = printerId;
    sseDisabledRef.current = true; // Disable SSE updates when selecting specific printer

    // Immediately fetch status for the selected printer
    try {
      console.log('[App] Fetching status for printer:', printerId);
      const data = await api.getStatus(printerId);
      console.log('[App] Received status:', data.name, data.id);

      setStatus(data);
      showToast(`Selected: ${data.name}`, 'info');

      // If status includes statistics, use them
      if (data.statistics) {
        setStats({
          totalPagesPrinted: data.statistics.totalPagesPrinted || 0,
          totalJobs: data.statistics.totalJobs || 0,
          successfulJobs: data.statistics.successfulJobs || 0,
          failedJobs: data.statistics.failedJobs || 0,
          completedJobs: data.statistics.successfulJobs || 0,
          totalInkUsed: data.statistics.totalInkUsed || { cyan: 0, magenta: 0, yellow: 0, black: 0 },
          maintenanceCycles: data.statistics.maintenanceCycles || 0,
          totalErrors: data.statistics.totalErrors || 0,
          averageJobSize: data.statistics.averageJobSize || 0,
          successRate: data.statistics.totalJobs > 0
            ? (data.statistics.successfulJobs / data.statistics.totalJobs) * 100
            : 100,
        });
      }
    } catch (error) {
      console.error('[App] Failed to fetch printer status:', error);
      showToast('Failed to load printer status', 'error');
    }
  }, [showToast]);

  // Initialize: Load printers and select default on mount
  useEffect(() => {
    const initializePrinters = async () => {
      try {
        const printersData = await api.getPrinters();
        console.log('[App] Loaded printers:', printersData.printers.length);

        if (printersData.printers.length > 0) {
          // Find default printer or use first one
          const defaultPrinter = printersData.summary.defaultPrinterId
            ? printersData.printers.find(p => p.id === printersData.summary.defaultPrinterId)
            : printersData.printers[0];

          if (defaultPrinter) {
            console.log('[App] Auto-selecting default printer:', defaultPrinter.name, defaultPrinter.id);
            setSelectedPrinterId(defaultPrinter.id);
            selectedPrinterIdRef.current = defaultPrinter.id;
            sseDisabledRef.current = true; // Use multi-printer mode
          }
        }
      } catch (error) {
        console.error('[App] Failed to load printers:', error);
      }
    };

    initializePrinters();
  }, []);

  // Polling for selected printer status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    const poll = async () => {
      const printerId = selectedPrinterIdRef.current;
      if (!printerId) {
        console.log('[App] No printer selected, skipping poll');
        return;
      }

      console.log('[App] Polling for printer:', printerId);

      try {
        const data = await api.getStatus(printerId);
        console.log('[App] Poll received:', data.name, data.id);
        setStatus(data);

        // Update stats from multi-printer status
        if (data.statistics) {
          setStats({
            totalPagesPrinted: data.statistics.totalPagesPrinted || 0,
            totalJobs: data.statistics.totalJobs || 0,
            successfulJobs: data.statistics.successfulJobs || 0,
            failedJobs: data.statistics.failedJobs || 0,
            completedJobs: data.statistics.successfulJobs || 0,
            totalInkUsed: data.statistics.totalInkUsed || { cyan: 0, magenta: 0, yellow: 0, black: 0 },
            maintenanceCycles: data.statistics.maintenanceCycles || 0,
            totalErrors: data.statistics.totalErrors || 0,
            averageJobSize: data.statistics.averageJobSize || 0,
            successRate: data.statistics.totalJobs > 0
              ? (data.statistics.successfulJobs / data.statistics.totalJobs) * 100
              : 100,
          });
        }
      } catch (error) {
        console.warn('[App] Poll failed:', error);
      }
    };

    // Start polling (first poll happens immediately when selectedPrinterId is set)
    if (selectedPrinterId) {
      poll(); // Initial fetch
      pollInterval = setInterval(poll, 30000); // Poll every 30 seconds
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [selectedPrinterId]); // Re-run when selected printer changes

  const getStatusColor = (printerStatus?: string) => {
    switch (printerStatus) {
      case 'ready':
        return 'success';
      case 'printing':
        return 'accent';
      case 'error':
        return 'danger';
      case 'paused':
      case 'warming_up':
        return 'attention';
      case 'offline':
        return 'fg';
      default:
        return 'fg';
    }
  };

  const statusColorScheme = getStatusColor(status?.status);

  return (
    <Box minH="100vh" bg={canvasBg}>
      {/* GitHub-style Header */}
      <Box
        as="header"
        bg={headerBg}
        borderBottom="1px solid"
        borderColor={borderColor}
        position="sticky"
        top={0}
        zIndex={100}
      >
        <Container maxW="100%" px={4}>
          <Flex h="62px" align="center" justify="space-between">
            {/* Left section - Logo and Nav */}
            <HStack spacing={4}>
              {/* Logo */}
              <HStack spacing={2} cursor="pointer" onClick={() => setSidebarVisible(!sidebarVisible)}>
                <Icon as={FiPrinter} boxSize={8} color={useColorModeValue('fgLight.default', 'fg.default')} />
              </HStack>

              {/* Repo-style breadcrumb - shows selected printer */}
              <HStack spacing={1} fontSize="sm">
                <Text fontWeight="semibold" color={useColorModeValue('accent.emphasis', 'accent.fg')}>
                  virtual-printer
                </Text>
                <Text color={mutedText}>/</Text>
                <Text fontWeight="semibold">
                  {status?.name || 'MCP Printer'}
                </Text>
                {status?.type && (
                  <>
                    <Text color={mutedText}>·</Text>
                    <Text color={mutedText} fontSize="xs">
                      {status.type.model}
                    </Text>
                  </>
                )}
              </HStack>

              {/* Status indicator */}
              <Tooltip label={`Printer is ${status?.status || 'initializing'}`}>
                <Box
                  px={2}
                  py={1}
                  borderRadius="full"
                  bg={`${statusColorScheme}.subtle`}
                  border="1px solid"
                  borderColor={`${statusColorScheme}.muted`}
                  display="flex"
                  alignItems="center"
                  gap={1.5}
                >
                  <Box
                    w={2}
                    h={2}
                    borderRadius="full"
                    bg={`${statusColorScheme}.fg`}
                    animation={status?.status === 'printing' ? 'pulse 2s infinite' : undefined}
                  />
                  <Text fontSize="xs" fontWeight="medium" color={`${statusColorScheme}.fg`} textTransform="capitalize">
                    {status?.status || 'Initializing'}
                  </Text>
                </Box>
              </Tooltip>
            </HStack>

            {/* Right section - Actions */}
            <HStack spacing={2}>
              <Tooltip label="Notifications">
                <IconButton
                  aria-label="Notifications"
                  icon={<FiBell />}
                  variant="ghost"
                  size="sm"
                />
              </Tooltip>
              <Tooltip label={`Switch to ${colorMode === 'dark' ? 'light' : 'dark'} mode`}>
                <IconButton
                  aria-label="Toggle color mode"
                  icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
                  onClick={toggleColorMode}
                  variant="ghost"
                  size="sm"
                />
              </Tooltip>
              <Tooltip label="Settings">
                <IconButton
                  aria-label="Settings"
                  icon={<FiSettings />}
                  onClick={onSettingsOpen}
                  variant="ghost"
                  size="sm"
                />
              </Tooltip>
            </HStack>
          </Flex>
        </Container>

        {/* Sub-navigation tabs */}
        <Container maxW="100%" px={4}>
          <Tabs index={activeTab} onChange={setActiveTab} variant="line">
            <TabList borderBottom="none">
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FiGitBranch} boxSize={4} />
                  <Text>Dashboard</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FiPrinter} boxSize={4} />
                  <Text>Print Jobs</Text>
                  {status?.queue?.length ? (
                    <Box
                      px={1.5}
                      py={0.5}
                      borderRadius="full"
                      bg={useColorModeValue('fgLight.muted', 'fg.muted')}
                      color={useColorModeValue('canvasLight.default', 'canvas.default')}
                      fontSize="xs"
                      fontWeight="semibold"
                      minW="20px"
                      textAlign="center"
                    >
                      {status.queue.length}
                    </Box>
                  ) : null}
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FiActivity} boxSize={4} />
                  <Text>Activity</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FiCode} boxSize={4} />
                  <Text>Testing</Text>
                </HStack>
              </Tab>
            </TabList>
          </Tabs>
        </Container>
      </Box>

      {/* Main Content Area */}
      <Flex>
        {/* Sidebar */}
        {sidebarVisible && (
          <Sidebar
            currentPrinter={status?.name}
            selectedPrinterId={selectedPrinterId}
            onSelectPrinter={handleSelectPrinter}
            currentLocationId={currentLocationId}
            onSelectLocation={handleSelectLocation}
            onNavigate={(section) => {
              if (section === 'dashboard') setActiveTab(0);
              else if (section === 'jobs') setActiveTab(1);
              else if (section === 'activity') setActiveTab(2);
            }}
          />
        )}

        {/* Main Content */}
        <Box flex={1} p={6} overflowY="auto">
          {activeTab === 0 && (
            <Grid
              templateColumns={{ base: '1fr', lg: 'repeat(12, 1fr)' }}
              gap={4}
            >
              {/* Main status area */}
              <GridItem colSpan={{ base: 12, lg: 8 }}>
                <StatusPanel status={status} />
              </GridItem>

              {/* Quick stats */}
              <GridItem colSpan={{ base: 12, lg: 4 }}>
                <StatsPanel stats={stats} />
              </GridItem>

              {/* Resources row */}
              <GridItem colSpan={{ base: 12, md: 6, lg: 4 }}>
                <InkLevels
                  inkLevels={status?.inkLevels}
                  inkStatus={status?.inkStatus}
                  onRefill={async (color) => {
                    // Optimistic update - set to 100% immediately
                    if (status) {
                      setStatus({
                        ...status,
                        inkLevels: {
                          ...status.inkLevels,
                          [color]: 100
                        }
                      });
                    }

                    const result = await api.refillInk(color, status?.id);
                    if (!result.success && status?.id) {
                      // Revert on failure
                      const freshStatus = await api.getStatus(status.id);
                      setStatus(freshStatus);
                    }
                    showToast(result.message, result.success ? 'success' : 'error');
                  }}
                  onSetLevel={async (color, level) => {
                    // Optimistic update - update UI immediately
                    if (status) {
                      setStatus({
                        ...status,
                        inkLevels: {
                          ...status.inkLevels,
                          [color]: level
                        }
                      });
                    }

                    // Send to server in background
                    try {
                      const result = await api.setInkLevel(color, level, status?.id);
                      if (!result.success) {
                        // Revert on failure
                        showToast(result.message || 'Failed to update ink level', 'error');
                        // Refresh from server
                        if (status?.id) {
                          const freshStatus = await api.getStatus(status.id);
                          setStatus(freshStatus);
                        }
                      } else {
                        showToast(result.message, 'success');
                      }
                    } catch (error) {
                      showToast('Failed to update ink level', 'error');
                      // Refresh from server on error
                      if (status?.id) {
                        const freshStatus = await api.getStatus(status.id);
                        setStatus(freshStatus);
                      }
                    }
                  }}
                />
              </GridItem>

              <GridItem colSpan={{ base: 12, md: 6, lg: 4 }}>
                <PaperTray
                  paper={status?.paper}
                  onLoadPaper={async (count, size) => {
                    // Optimistic update
                    if (status) {
                      const newCount = Math.min((status.paper?.count || 0) + count, status.paper?.capacity || 100);
                      setStatus({
                        ...status,
                        paper: {
                          ...status.paper!,
                          count: newCount,
                          size: size || status.paper?.size || 'A4'
                        }
                      });
                    }

                    const result = await api.loadPaper(count, size, status?.id);
                    if (!result.success && status?.id) {
                      const freshStatus = await api.getStatus(status.id);
                      setStatus(freshStatus);
                    }
                    showToast(result.message, result.success ? 'success' : 'error');
                  }}
                  onSetPaperCount={async (count, size) => {
                    // Optimistic update
                    if (status) {
                      setStatus({
                        ...status,
                        paper: {
                          ...status.paper!,
                          count,
                          size: size || status.paper?.size || 'A4'
                        }
                      });
                    }

                    const result = await api.setPaperCount(count, size, status?.id);
                    if (!result.success && status?.id) {
                      const freshStatus = await api.getStatus(status.id);
                      setStatus(freshStatus);
                    }
                    showToast(result.message, result.success ? 'success' : 'error');
                  }}
                />
              </GridItem>

              <GridItem colSpan={{ base: 12, lg: 4 }}>
                <ControlPanel
                  status={status?.status}
                  onPause={async () => {
                    const result = await api.pausePrinter();
                    showToast(result.message, result.success ? 'success' : 'error');
                  }}
                  onResume={async () => {
                    const result = await api.resumePrinter();
                    showToast(result.message, result.success ? 'success' : 'error');
                  }}
                  onPowerCycle={async () => {
                    if (confirm('Power cycle the printer? This will take about 15 seconds.')) {
                      const result = await api.powerCycle();
                      showToast(result.message, result.success ? 'success' : 'error');
                    }
                  }}
                  onReset={async () => {
                    if (confirm('Reset printer to factory defaults?')) {
                      const result = await api.resetPrinter();
                      showToast(result.message, result.success ? 'success' : 'error');
                      setTimeout(() => api.getStatistics().then(setStats), 1000);
                    }
                  }}
                  onCleanHeads={async () => {
                    const result = await api.cleanHeads();
                    showToast(result.message, result.success ? 'success' : 'error');
                  }}
                  onAlignHeads={async () => {
                    const result = await api.alignHeads();
                    showToast(result.message, result.success ? 'success' : 'error');
                  }}
                  onNozzleCheck={async () => {
                    const result = await api.nozzleCheck();
                    showToast(result.message, result.success ? 'success' : 'error');
                  }}
                  onClearJam={async () => {
                    const result = await api.clearJam();
                    showToast(result.message, result.success ? 'success' : 'error');
                  }}
                />
              </GridItem>

              {/* Print Form */}
              <GridItem colSpan={{ base: 12, lg: 4 }}>
                <PrintForm
                  onSubmit={async (data) => {
                    try {
                      const result = await api.printDocument(data);
                      if (result.success) {
                        showToast(`Print job submitted!`, 'success');
                      } else {
                        showToast(`Error: ${result.error}`, 'error');
                      }
                    } catch (error) {
                      showToast(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                    }
                  }}
                />
              </GridItem>

              {/* Queue preview */}
              <GridItem colSpan={{ base: 12, lg: 8 }}>
                <PrintQueue
                  queue={status?.queue}
                  onCancelJob={async (jobId) => {
                    const result = await api.cancelJob(jobId);
                    showToast(result.message, result.success ? 'success' : 'error');
                  }}
                />
              </GridItem>
            </Grid>
          )}

          {activeTab === 1 && (
            <Grid templateColumns={{ base: '1fr', lg: 'repeat(12, 1fr)' }} gap={4}>
              <GridItem colSpan={{ base: 12, lg: 8 }}>
                <PrintQueue
                  queue={status?.queue}
                  onCancelJob={async (jobId) => {
                    const result = await api.cancelJob(jobId);
                    showToast(result.message, result.success ? 'success' : 'error');
                  }}
                />
              </GridItem>
              <GridItem colSpan={{ base: 12, lg: 4 }}>
                <PrintForm
                  onSubmit={async (data) => {
                    try {
                      const result = await api.printDocument(data);
                      if (result.success) {
                        showToast(`Print job submitted!`, 'success');
                      } else {
                        showToast(`Error: ${result.error}`, 'error');
                      }
                    } catch (error) {
                      showToast(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                    }
                  }}
                />
              </GridItem>
            </Grid>
          )}

          {activeTab === 2 && (
            <Grid templateColumns={{ base: '1fr' }} gap={4}>
              <GridItem>
                <EventLog />
              </GridItem>
            </Grid>
          )}

          {activeTab === 3 && (
            <Box>
              <TemplateEditor />
            </Box>
          )}
        </Box>
      </Flex>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsOpen} onClose={onSettingsClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Settings />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* CSS for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </Box>
  );
}

export default App;
