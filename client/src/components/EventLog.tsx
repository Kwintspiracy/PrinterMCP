import { useEffect, useState } from 'react';
import { Box, Heading, VStack, Text, Button, HStack } from '@chakra-ui/react';
import { api, LogEntry } from '../api';

export default function EventLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const loadLogs = async () => {
    const data = await api.getLogs(50);
    setLogs(data.logs);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <Box bg="white" p={6} borderRadius="lg" shadow="sm">
      <HStack justify="space-between" mb={4}>
        <Heading size="md" color="brand.500">Event Log</Heading>
        <Button size="xs" onClick={loadLogs}>Refresh</Button>
      </HStack>
      <Box maxH="300px" overflowY="auto" bg="gray.900" p={3} borderRadius="md">
        <VStack align="stretch" spacing={1}>
          {logs.length === 0 && <Text color="gray.400">No logs available</Text>}
          {logs.map((log, i) => (
            <Box 
              key={i} 
              fontSize="xs" 
              fontFamily="mono" 
              color={log.level === 'error' ? 'red.300' : log.level === 'warning' ? 'yellow.300' : 'gray.300'}
              borderLeft="2px"
              borderColor={log.level === 'error' ? 'red.500' : log.level === 'warning' ? 'yellow.500' : 'blue.500'}
              pl={2}
            >
              <Text as="span" color="gray.500">{new Date(log.timestamp).toLocaleTimeString()}</Text>
              {' '}
              {log.message}
            </Box>
          ))}
        </VStack>
      </Box>
    </Box>
  );
}
