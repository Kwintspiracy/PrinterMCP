import { useEffect, useState } from 'react';
import { Box, Heading, VStack, Text, Button, HStack, Card, CardBody, useColorModeValue, Icon, Flex } from '@chakra-ui/react';
import { FiRefreshCw, FiTerminal } from 'react-icons/fi';
import { api, LogEntry } from '../api';

export default function EventLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const logBg = useColorModeValue('gray.900', 'gray.950');
  const emptyColor = useColorModeValue('gray.500', 'gray.600');

  const loadLogs = async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getLogs(50);
      setLogs(data.logs);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <Card>
      <CardBody>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="md" fontWeight="600" letterSpacing="-0.5px">
            Event Log
          </Heading>
          <Button
            size="sm"
            onClick={loadLogs}
            leftIcon={<Icon as={FiRefreshCw} />}
            isLoading={isRefreshing}
            variant="outline"
            aria-label="Refresh event log"
          >
            Refresh
          </Button>
        </Flex>
        <Box
          maxH="300px"
          overflowY="auto"
          bg={logBg}
          p={4}
          borderRadius="lg"
          border="1px"
          borderColor={useColorModeValue('gray.700', 'gray.800')}
        >
          <VStack align="stretch" spacing={2}>
            {logs.length === 0 && (
              <VStack py={8} spacing={3}>
                <Icon as={FiTerminal} boxSize={10} color={emptyColor} />
                <Text color={emptyColor} fontSize="sm" fontWeight="500">No logs available</Text>
              </VStack>
            )}
            {logs.map((log, i) => (
              <Box
                key={i}
                fontSize="xs"
                fontFamily="mono"
                color={log.level === 'error' ? 'red.300' : log.level === 'warning' ? 'yellow.300' : 'green.300'}
                borderLeft="3px"
                borderColor={log.level === 'error' ? 'red.500' : log.level === 'warning' ? 'yellow.500' : 'blue.500'}
                pl={3}
                py={1}
                transition="all 0.2s"
                _hover={{
                  bg: 'whiteAlpha.100',
                  borderLeftWidth: '4px',
                }}
                role="log"
                aria-label={`${log.level} log entry`}
              >
                <Text as="span" color="gray.500" fontWeight="600">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </Text>
                {' '}
                <Text as="span" color={log.level === 'error' ? 'red.400' : log.level === 'warning' ? 'yellow.400' : 'blue.400'} fontWeight="600">
                  {log.level.toUpperCase()}
                </Text>
                {' '}
                {log.message}
              </Box>
            ))}
          </VStack>
        </Box>
      </CardBody>
    </Card>
  );
}
