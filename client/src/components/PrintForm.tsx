import { useState } from 'react';
import { Box, Heading, VStack, FormControl, FormLabel, Input, NumberInput, NumberInputField, Checkbox, Select, Button } from '@chakra-ui/react';

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
    <Box bg="white" p={6} borderRadius="lg" shadow="sm">
      <Heading size="md" mb={4} color="brand.500">Test Print</Heading>
      <form onSubmit={handleSubmit}>
        <VStack spacing={3}>
          <FormControl>
            <FormLabel fontSize="sm">Document Name</FormLabel>
            <Input size="sm" value={documentName} onChange={(e) => setDocumentName(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Pages</FormLabel>
            <NumberInput size="sm" min={1} max={100} value={pages} onChange={(_, val) => setPages(val)}>
              <NumberInputField />
            </NumberInput>
          </FormControl>
          <FormControl>
            <Checkbox isChecked={color} onChange={(e) => setColor(e.target.checked)}>Color Print</Checkbox>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Quality</FormLabel>
            <Select size="sm" value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="draft">Draft</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="photo">Photo</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Paper Size</FormLabel>
            <Select size="sm" value={paperSize} onChange={(e) => setPaperSize(e.target.value)}>
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
              <option value="A3">A3</option>
              <option value="4x6">4x6</option>
            </Select>
          </FormControl>
          <Button type="submit" w="full" colorScheme="brand" size="lg">🖨️ Print Document</Button>
        </VStack>
      </form>
    </Box>
  );
}
