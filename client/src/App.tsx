import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Flex,
  Heading,
  Badge,
  Grid,
  useToast,
  IconButton,
  useColorMode,
  Text,
  GridItem,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { api, PrinterStatus, Statistics, useSSE } from './api';
import StatusPanel from './components/StatusPanel';
import InkLevels from './components/InkLevels';
import PaperTray from './components/PaperTray';
import PrintQueue from './components/PrintQueue';
import ControlPanel from './components/ControlPanel';
import PrintForm from './components/PrintForm';
import StatsPanel from './components/StatsPanel';
import EventLog from './components/EventLog';

function App() {
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [stats, setStats] = useState<Statistics | null>(null);
  const toast = useToast();
  const { colorMode, toggleColorMode } = useColorMode();

  // Real-time updates via SSE
  useEffect(() => {
    const cleanup = useSSE((newStatus) => {
      setStatus(newStatus);
    });

    // Load initial statistics
    api.getStatistics().then(setStats).catch(console.error);

    return cleanup;
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    toast({
      title: message,
      status: type,
      duration: 3000,
      isClosable: true,
      position: 'top-right',
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ready':
        return 'green';
      case 'printing':
        return 'blue';
      case 'error':
        return 'red';
      case 'paused':
      case 'warming_up':
        return 'orange';
      case 'offline':
        return 'gray';
      default:
        return 'gray';
    }
  };

  return (
    <Box minH="100vh" bg={colorMode === 'dark' ? 'black' : '#f5f5f7'}>
      {/* Navbar with glassmorphism */}
      <Box
        position="sticky"
        top="0"
        zIndex="100"
        bg={colorMode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)'}
        backdropFilter="blur(20px)"
        borderBottom="1px solid"
        borderColor={colorMode === 'dark' ? 'whiteAlpha.100' : 'blackAlpha.50'}
        mb={8}
      >
        <Container maxW="container.xl" py={4}>
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={3}>
              <Box
                fontSize="2xl"
                bgGradient="linear(to-r, apple.blue, purple.500)"
                bgClip="text"
                fontWeight="bold"
              >
                
              </Box>
              <Box>
                <Heading size="md" fontWeight="600" letterSpacing="-0.5px">
                  Virtual Printer
                </Heading>
              </Box>
            </Flex>

            <Flex align="center" gap={4}>
              <Badge
                colorScheme={getStatusColor(status?.status)}
                variant="subtle"
                fontSize="xs"
                px={3}
                py={1.5}
                borderRadius="full"
                textTransform="capitalize"
                letterSpacing="wide"
              >
                ● {status?.status || 'Initializing...'}
              </Badge>
              <IconButton
                aria-label="Toggle color mode"
                icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
                onClick={toggleColorMode}
                variant="ghost"
                size="sm"
                borderRadius="full"
              />
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.xl" pb={12}>
        <Grid
          templateColumns={{ base: '1fr', lg: 'repeat(12, 1fr)' }}
          gap={6}
          autoRows="minmax(180px, auto)"
        >
          {/* Status Panel - Large Hero Card */}
          <GridItem colSpan={{ base: 12, lg: 8 }} rowSpan={2}>
            <StatusPanel status={status} />
          </GridItem>

          {/* Quick Actions / Controls */}
          <GridItem colSpan={{ base: 12, lg: 4 }} rowSpan={2}>
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

          {/* Resources Row */}
          <GridItem colSpan={{ base: 12, md: 6, lg: 4 }}>
            <InkLevels
              inkLevels={status?.inkLevels}
              onRefill={async (color) => {
                const result = await api.refillInk(color);
                showToast(result.message, result.success ? 'success' : 'error');
              }}
              onSetLevel={async (color, level) => {
                const result = await api.setInkLevel(color, level);
                showToast(result.message, result.success ? 'success' : 'error');
              }}
            />
          </GridItem>

          <GridItem colSpan={{ base: 12, md: 6, lg: 4 }}>
            <PaperTray
              paper={status?.paper}
              onLoadPaper={async (count, size) => {
                const result = await api.loadPaper(count, size);
                showToast(result.message, result.success ? 'success' : 'error');
              }}
              onSetPaperCount={async (count, size) => {
                const result = await api.setPaperCount(count, size);
                showToast(result.message, result.success ? 'success' : 'error');
              }}
            />
          </GridItem>

          <GridItem colSpan={{ base: 12, lg: 4 }}>
            <StatsPanel stats={stats} />
          </GridItem>

          {/* Bottom Row */}
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

          <GridItem colSpan={12}>
            <EventLog />
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
}

export default App;
