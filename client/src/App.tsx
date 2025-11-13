import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Flex,
  Heading,
  Badge,
  Grid,
  useToast,
} from '@chakra-ui/react';
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
    <Box minH="100vh" bg="gray.50">
      <Box bg="white" shadow="sm" borderBottom="1px" borderColor="gray.200" mb={6}>
        <Container maxW="container.xl" py={4}>
          <Flex justify="space-between" align="center">
            <Heading size="lg" color="brand.500">
              🖨️ Virtual Printer Dashboard
            </Heading>
            <Badge
              colorScheme={getStatusColor(status?.status)}
              fontSize="md"
              px={3}
              py={1}
              borderRadius="full"
            >
              {status?.status || 'Initializing...'}
            </Badge>
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.xl">
        <Grid
          templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }}
          gap={6}
          mb={6}
        >
          <StatusPanel status={status} />
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
          <PrintQueue
            queue={status?.queue}
            onCancelJob={async (jobId) => {
              const result = await api.cancelJob(jobId);
              showToast(result.message, result.success ? 'success' : 'error');
            }}
          />
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
              if (
                confirm(
                  'Reset printer to factory defaults? This will clear all jobs, errors, and statistics.'
                )
              ) {
                const result = await api.resetPrinter();
                showToast(result.message, result.success ? 'success' : 'error');
                // Reload stats after reset
                setTimeout(() => {
                  api.getStatistics().then(setStats);
                }, 1000);
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
          <PrintForm
            onSubmit={async (data) => {
              try {
                const result = await api.printDocument(data);
                if (result.success) {
                  showToast(`Print job submitted! Job ID: ${result.jobId}`, 'success');
                } else {
                  showToast(`Error: ${result.error}`, 'error');
                }
              } catch (error) {
                console.error('Print error:', error);
                showToast(
                  `Failed to submit print job: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  'error'
                );
              }
            }}
          />
          <StatsPanel stats={stats} />
          <EventLog />
        </Grid>
      </Container>
    </Box>
  );
}

export default App;
