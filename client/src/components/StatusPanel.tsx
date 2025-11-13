import { Box, Heading, VStack, HStack, Text, Progress, Alert, AlertIcon, AlertTitle, AlertDescription, Badge } from '@chakra-ui/react';
import { PrinterStatus } from '../api';

interface StatusPanelProps {
  status: PrinterStatus | null;
}

export default function StatusPanel({ status }: StatusPanelProps) {
  if (!status) {
    return (
      <Box bg="white" p={6} borderRadius="lg" shadow="sm">
        <Heading size="md" mb={4} color="brand.500">
          Printer Status
        </Heading>
        <Text color="gray.500">Loading...</Text>
      </Box>
    );
  }

  const getOperationalColor = (opStatus: string) => {
    switch (opStatus) {
      case 'ready':
        return 'green';
      case 'not_ready':
        return 'orange';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const currentJob = status.currentJob;
  const progress = currentJob?.progress ? parseFloat(String(currentJob.progress)) : 0;

  return (
    <Box bg="white" p={6} borderRadius="lg" shadow="sm">
      <Heading size="md" mb={4} color="brand.500">
        Printer Status
      </Heading>
      
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <Text fontWeight="semibold">Printer State:</Text>
          <Text textTransform="capitalize">{status.status.replace('_', ' ')}</Text>
        </HStack>
        
        <HStack justify="space-between">
          <Text fontWeight="semibold">Operational Status:</Text>
          <Badge 
            colorScheme={getOperationalColor(status.operationalStatus)} 
            fontSize="md" 
            px={3} 
            py={1}
          >
            {status.operationalStatus.replace('_', ' ').toUpperCase()}
          </Badge>
        </HStack>
        
        <HStack justify="space-between">
          <Text fontWeight="semibold">Can Print:</Text>
          <Badge colorScheme={status.canPrint ? 'green' : 'red'} fontSize="md" px={3} py={1}>
            {status.canPrint ? 'YES' : 'NO'}
          </Badge>
        </HStack>
      </VStack>

      {status.issues && status.issues.length > 0 && (
        <Alert status="warning" mt={4} borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Issues Detected</AlertTitle>
            <VStack align="stretch" spacing={1} mt={2}>
              {status.issues.map((issue, i) => (
                <AlertDescription key={i} fontSize="sm">
                  • {issue}
                </AlertDescription>
              ))}
            </VStack>
          </Box>
        </Alert>
      )}

      {currentJob && (
        <Box mt={4} p={4} bg="blue.50" borderRadius="md" borderLeft="4px" borderColor="blue.500">
          <Heading size="sm" mb={2}>Current Job</Heading>
          <Text fontSize="sm"><strong>Document:</strong> {currentJob.document}</Text>
          <Text fontSize="sm" mb={2}><strong>Progress:</strong> {currentJob.progress}</Text>
          <Progress value={progress} size="sm" colorScheme="blue" borderRadius="full" />
        </Box>
      )}

      {status.errors.length > 0 && (
        <Alert status="error" mt={4} borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Errors</AlertTitle>
            <VStack align="stretch" spacing={1} mt={2}>
              {status.errors.map((error, i) => (
                <AlertDescription key={i} fontSize="sm">
                  <strong>{error.type}:</strong> {error.message}
                </AlertDescription>
              ))}
            </VStack>
          </Box>
        </Alert>
      )}
    </Box>
  );
}
