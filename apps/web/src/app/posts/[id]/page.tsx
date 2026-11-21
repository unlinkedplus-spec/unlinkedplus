import PostDetail from '../../../components/PostDetail';

/** Dynamic post detail route used by real notification links. */
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostDetail id={id} />;
}
