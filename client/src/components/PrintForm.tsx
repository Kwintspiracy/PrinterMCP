import { useState } from 'react';
import { Box, Heading, VStack, FormControl, FormLabel, Input, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Checkbox, Select, Button, Card, CardBody, Icon } from '@chakra-ui/react';
import { FiPrinter } from 'react-icons/fi';

interface PrintFormProps {
  onSubmit: (data: { documentName: string; pages: number; color: boolean; quality: string; paperSize: string }) => void;
}

export default function PrintForm({ onSubmit }: PrintFormProps) {
  const [documentName, setDocumentName] = useState('Test Document');
  const [pages, setPages] = useState(5);
  const [color, setColor] = useState(true);
  const [quality, setQuality] = useState('normal');
  const [paperSize, setPaperSize] = useState('A4');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ documentName, pages, color, quality, paperSize });
  };

  return (
    <Card>
      <CardBody>
        <Heading size="md" mb={6} fontWeight="600" letterSpacing="-0.5px">
          Test Print
        </Heading>
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="600">Document Name</FormLabel>
              <Input
                size="md"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Enter document name"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="600">Pages</FormLabel>
              <NumberInput size="md" min={1} max={100} value={pages} onChange={(_, val) => setPages(val)}>
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            <FormControl>
              <Checkbox
                isChecked={color}
                onChange={(e) => setColor(e.target.checked)}
                size="lg"
                colorScheme="blue"
              >
                Color Print
              </Checkbox>
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="600">Quality</FormLabel>
              <Select size="md" value={quality} onChange={(e) => setQuality(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="photo">Photo</option>
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="600">Paper Size</FormLabel>
              <Select size="md" value={paperSize} onChange={(e) => setPaperSize(e.target.value)}>
                <option value="A4">A4</option>
                <option value="A5">A5</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
                <option value="A3">A3</option>
                <option value="4x6">4x6</option>
              </Select>
            </FormControl>
            <Button
              type="submit"
              w="full"
              colorScheme="blue"
              size="lg"
              leftIcon={<Icon as={FiPrinter} />}
              aria-label="Submit print job"
            >
              Print Document
            </Button>
          </VStack>
        </form>
      </CardBody>
    </Card>
  );
}
