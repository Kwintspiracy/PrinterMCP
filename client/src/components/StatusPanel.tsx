import {
  Box,
  HStack,
  VStack,
  Text,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Icon,
  useColorModeValue,
  Flex,
} from '@chakra-ui/react';
import { FiCheckCircle, FiAlertTriangle, FiXCircle, FiClock, FiPrinter, FiFileText } from 'react-icons/fi';
import { PrinterStatus } from '../api';

interface StatusPanelProps {
  status: PrinterStatus | null;
}

export default function StatusPanel({ status }: StatusPanelProps) {
  const borderColor = useColorModeValue('borderLight.default', 'border.default');
  const cardBg = useColorModeValue('canvasLight.default', 'canvas.subtle');
  const headerBg = useColorModeValue('canvasLight.subtle', 'canvas.default');
  const mutedText = useColorModeValue('fgLight.muted', 'fg.muted');
  const subtleText = useColorModeValue('fgLight.subtle', 'fg.subtle');

  if (!status) {
    return (
      <Box
        border="1px solid"
        borderColor={borderColor}
        borderRadius="md"
        bg={cardBg}
        overflow="hidden"
      >
        <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor} bg={headerBg}>
          <Text fontWeight="semibold" fontSize="sm">Printer Status</Text>
        </Box>
        <Box p={4}>
          <HStack spacing={2} color={mutedText}>
            <Icon as={FiClock} />
            <Text fontSize="sm">Loading printer status...</Text>
          </HStack>
        </Box>
      </Box>
    );
  }

  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case 'ready':
        return FiCheckCircle;
      case 'printing':
        return FiPrinter;
      case 'error':
        return FiXCircle;
      case 'paused':
      case 'warming_up':
        return FiClock;
      default:
        return FiAlertTriangle;
    }
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'ready':
        return 'success';
      case 'printing':
        return 'accent';
      case 'error':
        return 'danger';
      case 'paused':
      case 'warming_up':
        return 'attention';
      default:
        return 'fg';
    }
  };

  const getOperationalColor = (opStatus: string) => {
    switch (opStatus) {
      case 'ready':
        return 'success';
      case 'not_ready':
        return 'attention';
      case 'error':
        return 'danger';
      default:
        return 'fg';
    }
  };

  const statusColor = getStatusColor(status.status);
  const operationalColor = getOperationalColor(status.operationalStatus);
  const currentJob = status.currentJob;
  const progress = currentJob?.progress ? parseFloat(String(currentJob.progress)) : 0;

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
          <Text fontWeight="semibold" fontSize="sm">Printer Status</Text>
          <HStack spacing={2}>
            <Box
              px={2}
              py={0.5}
              borderRadius="full"
              bg={`${statusColor}.subtle`}
              display="flex"
              alignItems="center"
              gap={1.5}
            >
              <Icon as={getStatusIcon(status.status)} boxSize={3} color={`${statusColor}.fg`} />
              <Text fontSize="xs" fontWeight="medium" color={`${statusColor}.fg`} textTransform="capitalize">
                {status.status.replace('_', ' ')}
              </Text>
            </Box>
          </HStack>
        </Flex>
      </Box>

      {/* Status Grid */}
      <Box p={4}>
        <VStack align="stretch" spacing={3}>
          {/* Status Row */}
          <HStack justify="space-between" py={2} borderBottom="1px solid" borderColor={borderColor}>
            <Text fontSize="sm" color={mutedText}>Operational Status</Text>
            <Box
              px={2}
              py={0.5}
              borderRadius="full"
              bg={`${operationalColor}.subtle`}
              border="1px solid"
              borderColor={`${operationalColor}.muted`}
            >
              <Text fontSize="xs" fontWeight="medium" color={`${operationalColor}.fg`} textTransform="uppercase">
                {status.operationalStatus.replace('_', ' ')}
              </Text>
            </Box>
          </HStack>

          {/* Can Print Row */}
          <HStack justify="space-between" py={2} borderBottom="1px solid" borderColor={borderColor}>
            <Text fontSize="sm" color={mutedText}>Ready to Print</Text>
            <HStack spacing={2}>
              <Icon
                as={status.canPrint ? FiCheckCircle : FiXCircle}
                color={status.canPrint ? 'success.fg' : 'danger.fg'}
                boxSize={4}
              />
              <Text fontSize="sm" fontWeight="medium" color={status.canPrint ? 'success.fg' : 'danger.fg'}>
                {status.canPrint ? 'Yes' : 'No'}
              </Text>
            </HStack>
          </HStack>

          {/* Printer Name Row */}
          <HStack justify="space-between" py={2} borderBottom="1px solid" borderColor={borderColor}>
            <Text fontSize="sm" color={mutedText}>Printer Name</Text>
            <Text fontSize="sm" fontWeight="medium">{status.name}</Text>
          </HStack>

          {/* Queue Length Row */}
          <HStack justify="space-between" py={2}>
            <Text fontSize="sm" color={mutedText}>Queue Length</Text>
            <Text fontSize="sm" fontWeight="medium">{status.queue?.length || 0} jobs</Text>
          </HStack>
        </VStack>

        {/* Current Job */}
        {currentJob && (
          <Box
            mt={4}
            p={4}
            bg={useColorModeValue('accent.subtle', 'accent.subtle')}
            borderRadius="md"
            border="1px solid"
            borderColor={useColorModeValue('accent.muted', 'accent.muted')}
          >
            <HStack spacing={3} mb={3}>
              <Icon as={FiFileText} color="accent.fg" boxSize={5} />
              <Box flex={1}>
                <Text fontWeight="semibold" fontSize="sm">Printing: {currentJob.document}</Text>
                <Text fontSize="xs" color={mutedText}>{currentJob.progress}</Text>
              </Box>
            </HStack>
            <Progress
              value={progress}
              size="sm"
              colorScheme="blue"
              borderRadius="full"
              bg={useColorModeValue('canvasLight.inset', 'canvas.inset')}
              aria-label={`Print progress: ${progress}%`}
            />
          </Box>
        )}

        {/* Issues Alert */}
        {status.issues && status.issues.length > 0 && (
          <Alert status="warning" mt={4} variant="subtle" borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle fontSize="sm" fontWeight="semibold">Issues Detected</AlertTitle>
              <VStack align="stretch" spacing={0.5} mt={1}>
                {status.issues.map((issue, i) => (
                  <AlertDescription key={i} fontSize="sm">
                    • {issue}
                  </AlertDescription>
                ))}
              </VStack>
            </Box>
          </Alert>
        )}

        {/* Errors Alert */}
        {status.errors.length > 0 && (
          <Alert status="error" mt={4} variant="subtle" borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle fontSize="sm" fontWeight="semibold">Errors</AlertTitle>
              <VStack align="stretch" spacing={0.5} mt={1}>
                {status.errors.map((error, i) => (
                  <AlertDescription key={i} fontSize="sm">
                    <Text as="span" fontWeight="medium">{error.type}:</Text> {error.message}
                  </AlertDescription>
                ))}
              </VStack>
            </Box>
          </Alert>
        )}
      </Box>
    </Box>
  );
}
