import { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  useColorModeValue,
  Flex,
  Badge,
  Select,
} from '@chakra-ui/react';
import { FiRefreshCw, FiTerminal, FiAlertCircle, FiAlertTriangle, FiInfo, FiFilter } from 'react-icons/fi';
import { api, LogEntry } from '../api';

export default function EventLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const borderColor = useColorModeValue('borderLight.default', 'border.default');
  const cardBg = useColorModeValue('canvasLight.default', 'canvas.subtle');
  const headerBg = useColorModeValue('canvasLight.subtle', 'canvas.default');
  const mutedText = useColorModeValue('fgLight.muted', 'fg.muted');
  const logBg = useColorModeValue('canvas.default', 'canvas.inset');
  const hoverBg = useColorModeValue('canvasLight.subtle', 'canvas.default');

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

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return FiAlertCircle;
      case 'warning':
        return FiAlertTriangle;
      default:
        return FiInfo;
    }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'danger';
      case 'warning':
        return 'attention';
      default:
        return 'accent';
    }
  };

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  const logCounts = {
    all: logs.length,
    error: logs.filter(l => l.level === 'error').length,
    warning: logs.filter(l => l.level === 'warning').length,
    info: logs.filter(l => l.level === 'info').length,
  };

  return (
    <Box
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      bg={cardBg}
      overflow="hidden"
    >
      {/* Header */}
      <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor} bg={headerBg}>
        <Flex justify="space-between" align="center">
          <HStack spacing={2}>
            <Icon as={FiTerminal} boxSize={4} color={mutedText} />
            <Text fontWeight="semibold" fontSize="sm">Event Log</Text>
            <Badge
              px={2}
              py={0.5}
              borderRadius="full"
              bg={useColorModeValue('canvasLight.inset', 'canvas.inset')}
              color={mutedText}
              fontSize="xs"
            >
              {logs.length} events
            </Badge>
          </HStack>
          <HStack spacing={2}>
            <HStack spacing={1}>
              <Icon as={FiFilter} boxSize={3} color={mutedText} />
              <Select
                size="sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                w="120px"
              >
                <option value="all">All ({logCounts.all})</option>
                <option value="error">Errors ({logCounts.error})</option>
                <option value="warning">Warnings ({logCounts.warning})</option>
                <option value="info">Info ({logCounts.info})</option>
              </Select>
            </HStack>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Icon as={FiRefreshCw} boxSize={3} />}
              onClick={loadLogs}
              isLoading={isRefreshing}
              aria-label="Refresh event log"
            >
              Refresh
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Log Entries */}
      <Box
        maxH="400px"
        overflowY="auto"
        bg={logBg}
        fontFamily="mono"
        fontSize="xs"
      >
        {filteredLogs.length === 0 ? (
          <VStack py={8} spacing={3}>
            <Box
              w={12}
              h={12}
              borderRadius="full"
              bg={useColorModeValue('canvasLight.inset', 'canvas.subtle')}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={FiTerminal} boxSize={6} color={mutedText} />
            </Box>
            <Text fontSize="sm" color={mutedText} fontWeight="medium" fontFamily="body">
              No log entries
            </Text>
            <Text fontSize="xs" color={useColorModeValue('fgLight.subtle', 'fg.subtle')} fontFamily="body">
              {filter !== 'all' ? 'No entries match the current filter' : 'Events will appear here as they occur'}
            </Text>
          </VStack>
        ) : (
          <VStack spacing={0} align="stretch">
            {filteredLogs.map((log, i) => {
              const logColor = getLogColor(log.level);
              const LogIcon = getLogIcon(log.level);

              return (
                <Box
                  key={i}
                  px={4}
                  py={2}
                  borderBottom="1px solid"
                  borderColor={borderColor}
                  _hover={{ bg: hoverBg }}
                  transition="background 0.1s ease"
                >
                  <Flex align="flex-start" gap={3}>
                    <Icon
                      as={LogIcon}
                      boxSize={4}
                      color={`${logColor}.fg`}
                      mt={0.5}
                      flexShrink={0}
                    />
                    <Box flex={1} minW={0}>
                      <HStack spacing={2} mb={0.5}>
                        <Text
                          color={mutedText}
                          fontSize="xs"
                          fontWeight="medium"
                        >
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </Text>
                        <Box
                          px={1.5}
                          py={0.5}
                          borderRadius="sm"
                          bg={`${logColor}.subtle`}
                        >
                          <Text
                            fontSize="xs"
                            fontWeight="semibold"
                            color={`${logColor}.fg`}
                            textTransform="uppercase"
                          >
                            {log.level}
                          </Text>
                        </Box>
                      </HStack>
                      <Text
                        color={useColorModeValue('fgLight.default', 'fg.default')}
                        wordBreak="break-word"
                      >
                        {log.message}
                      </Text>
                    </Box>
                  </Flex>
                </Box>
              );
            })}
          </VStack>
        )}
      </Box>

      {/* Footer */}
      <Box px={4} py={2} borderTop="1px solid" borderColor={borderColor} bg={headerBg}>
        <HStack justify="space-between">
          <Text fontSize="xs" color={mutedText}>
            Showing {filteredLogs.length} of {logs.length} entries
          </Text>
          {logCounts.error > 0 && (
            <HStack spacing={1}>
              <Icon as={FiAlertCircle} boxSize={3} color="danger.fg" />
              <Text fontSize="xs" color="danger.fg" fontWeight="medium">
                {logCounts.error} error{logCounts.error !== 1 ? 's' : ''}
              </Text>
            </HStack>
          )}
        </HStack>
      </Box>
    </Box>
  );
}
