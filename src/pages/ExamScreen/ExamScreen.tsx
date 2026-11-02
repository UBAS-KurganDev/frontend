import { ArrowLeft, Plus } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export default function ExamScreen() {
  const questions = [
    {
      id: 1,
      title: 'Что называется рангом матрицы?',
      subtitle: 'Ранг матрицы — понятие в линейной алгебре...',
    },
    {
      id: 2,
      title: 'Что называется рангом матрицы?',
      subtitle: 'Ранг матрицы — понятие в линейной алгебре...',
    },
    {
      id: 3,
      title: 'Что называется рангом матрицы?',
      subtitle: 'Ранг матрицы — понятие в линейной алгебре...',
    },
    {
      id: 4,
      title: 'Что такое ядро гомоморфизма?',
      subtitle: 'Ядро гомоморфизма — это множество элементов...',
    },
    {
      id: 5,
      title: 'Что называется рангом матрицы?',
      subtitle: 'Ранг матрицы — понятие в линейной алгебре...',
    },
  ];

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" aria-label="Назад">
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Экзамен по алгему</h1>
      </header>
      <Card className="py-0">
        <CardContent className="divide-y px-5 sm:px-6">
          {questions.map((question) => (
            <div key={question.id} className="flex items-start gap-4 py-5">
              <Badge
                variant="secondary"
                className="flex size-8 shrink-0 items-center justify-center rounded-full"
              >
                {question.id}
              </Badge>
              <div className="min-w-0 space-y-1">
                <h2 className="font-medium">{question.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{question.subtitle}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Button type="button" variant="outline" className="w-full">
        <Plus aria-hidden="true" />
        Добавить вопрос
      </Button>
    </main>
  );
}
