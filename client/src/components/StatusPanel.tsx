import { Box, Heading, VStack, HStack, Text, Progress, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
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

  const currentJob = status.currentJob;
  const progress = currentJob?.progress ? parseFloat(String(currentJob.progress)) : 0;

  return (
    <Box bg="white" p={6} borderRadius="lg" shadow="sm">
      <Heading size="md" mb={4} color="brand.500">
        Printer Status
      </Heading>
      
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <Text fontWeight="semibold">Status:</Text>
          <Text textTransform="capitalize">{status.status.replace('_', ' ')}</Text>
        </HStack>
      </VStack>

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
          <Box>
            <AlertTitle>Errors</AlertTitle>
            {status.errors.map((error, i) => (
              <AlertDescription key={i} fontSize="sm">
                <strong>{error.type}:</strong> {error.message}
              </AlertDescription>
            ))}
          </Box>
        </Alert>
      )}
    </Box>
  );
}
