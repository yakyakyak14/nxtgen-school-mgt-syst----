import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Library as LibraryIcon, Plus, Search, Book, BookOpen, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface LibraryBook {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  quantity: number | null;
  available: number | null;
  category: string | null;
}

interface LibraryStats {
  totalBooks: number;
  available: number;
  onLoan: number;
}

const Library: React.FC = () => {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [stats, setStats] = useState<LibraryStats>({
    totalBooks: 0,
    available: 0,
    onLoan: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchLibraryData = async () => {
    setIsLoading(true);
    try {
      const { data: booksData, error } = await supabase
        .from('library_books')
        .select('*')
        .order('title');

      if (error) throw error;

      setBooks(booksData || []);

      // Calculate stats
      const totalBooks = booksData?.reduce((sum, b) => sum + (b.quantity || 0), 0) || 0;
      const available = booksData?.reduce((sum, b) => sum + (b.available || 0), 0) || 0;
      const onLoan = totalBooks - available;

      setStats({
        totalBooks,
        available,
        onLoan,
      });
    } catch (error) {
      console.error('Error fetching library data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.isbn?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Library</h1>
          <p className="page-subtitle">Manage book inventory and loans</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Book
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-16 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Book className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalBooks.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Books</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <LibraryIcon className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.available.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.onLoan.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">On Loan</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle>Book Inventory</CardTitle>
            <div className="search-input w-full sm:w-64">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search books..."
                className="border-0 bg-transparent h-8 focus-visible:ring-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author/Publisher</TableHead>
                  <TableHead>ISBN</TableHead>
                  <TableHead className="text-center">Available</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredBooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No books found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBooks.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell className="font-medium">{book.title}</TableCell>
                      <TableCell>{book.author || 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{book.isbn || 'N/A'}</TableCell>
                      <TableCell className="text-center">{book.available || 0}</TableCell>
                      <TableCell className="text-center">{book.quantity || 0}</TableCell>
                      <TableCell>
                        <Badge variant={(book.available || 0) > 0 ? 'default' : 'destructive'}>
                          {(book.available || 0) > 0 ? 'In Stock' : 'Out of Stock'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Library;
